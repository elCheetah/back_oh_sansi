import prisma from "../config/database";
import { FiltroMedallero, GanadorItem, GrupoResumen, SnapshotMedallero } from "../types/medallero.types";

/** Obtiene la fase Final y valida que esté FINALIZADA */
async function getFaseFinalIdStrict(): Promise<number> {
  const fase = await prisma.fases.findFirst({
    where: { nombre: { equals: "Final", mode: "insensitive" }, estado: "FINALIZADA" },
    select: { id: true },
  });
  if (!fase) throw new Error("La Fase Final no está FINALIZADA o no existe.");
  return fase.id;
}

/** Lee config de medallas por (área, nivel). Si no hay, usa 1-1-1-0 */
async function getConfig(area_id: number, nivel_id: number) {
  const cfg = await prisma.configMedallas.findUnique({
    where: { area_id_nivel_id: { area_id, nivel_id } },
    select: { oros: true, platas: true, bronces: true, menciones: true },
  });
  return cfg ?? { oros: 1, platas: 1, bronces: 1, menciones: 0 };
}

/** Construye el snapshot del medallero (sin persistir). */
export async function buildMedalleroSnapshot(f: FiltroMedallero): Promise<SnapshotMedallero> {
  const faseFinalId = await getFaseFinalIdStrict();

  const areaId = f.area_id ? Number(f.area_id) : undefined;
  const nivelId = f.nivel_id ? Number(f.nivel_id) : undefined;
  const modalidad = f.modalidad;

  // 1) Participaciones válidas (no DESCALIFICADO) + contexto
  const participaciones = await prisma.participacion.findMany({
    where: {
      estado: { not: "DESCALIFICADO" },
      ...(areaId ? { area_id: areaId } : {}),
      ...(nivelId ? { nivel_id: nivelId } : {}),
      ...(modalidad ? { tipo: modalidad } : {}),
    },
    select: {
      id: true,
      tipo: true,
      area_id: true,
      nivel_id: true,
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
      olimpista: {
        select: {
          nombre: true,
          ap_paterno: true,
          ap_materno: true,
          numero_documento: true,
          unidad_educativa: true,
        },
      },
      equipo: { select: { nombre: true } },
    },
  });

  if (participaciones.length === 0) {
    return { publicados_en: new Date().toISOString(), fase_final_id: faseFinalId, grupos: [] };
  }

  // 2) Notas validadas en Fase Final (promedio)
  const ids = participaciones.map(p => p.id);
  const notas = await prisma.evaluaciones.groupBy({
    by: ["participacion_id"],
    where: { participacion_id: { in: ids }, fase_id: faseFinalId, validado: true },
    _avg: { nota: true },
  });

  const avgMap = new Map<number, number>();
  notas.forEach(n => avgMap.set(n.participacion_id, Number(n._avg.nota ?? 0)));

  // 3) Construcción de ítems base
  const items: GanadorItem[] = participaciones.map(p => {
    const isInd = p.tipo === "INDIVIDUAL";
    const nombre = isInd
      ? [p.olimpista?.nombre, p.olimpista?.ap_paterno, p.olimpista?.ap_materno].filter(Boolean).join(" ")
      : (p.equipo?.nombre ?? "Equipo");
    return {
      participacion_id: p.id,
      posicion: 0,
      area_id: p.area_id,
      area: p.area.nombre,
      nivel_id: p.nivel_id,
      nivel: p.nivel.nombre,
      modalidad: p.tipo as "INDIVIDUAL" | "EQUIPO",
      nombre,
      ci: isInd ? (p.olimpista?.numero_documento ?? null) : null,
      unidadEducativa: isInd ? (p.olimpista?.unidad_educativa ?? null) : null,
      nota: Number(avgMap.get(p.id) ?? 0),
      distincion: null,
    };
  });

  // 4) Agrupar por (area_id, nivel_id, modalidad)
  const grupos = new Map<string, GanadorItem[]>();
  for (const it of items) {
    const key = `${it.area_id}__${it.nivel_id}__${it.modalidad}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(it);
  }

  // 5) Rank + medallas por grupo según config_medallas
  const out: SnapshotMedallero["grupos"] = [];

  for (const [key, arr] of grupos) {
    const [aId, nId] = key.split("__").map(Number);
    const cfg = await getConfig(aId, nId);

    // Orden por nota desc
    arr.sort((x, y) => y.nota - x.nota);

    let pos = 1;
    let oro = cfg.oros, plata = cfg.platas, bronce = cfg.bronces, menc = cfg.menciones;

    const ganadores = arr.map(it => {
      let dist: GanadorItem["distincion"] = null;
      if (oro > 0) { dist = "Medalla de Oro"; oro--; }
      else if (plata > 0) { dist = "Medalla de Plata"; plata--; }
      else if (bronce > 0) { dist = "Medalla de Bronce"; bronce--; }
      else if (menc > 0) { dist = "Mención"; menc--; }
      return { ...it, posicion: pos++, distincion: dist };
    });

    const resumen: GrupoResumen = {
      area_id: aId,
      area: ganadores[0]?.area ?? "",
      nivel_id: nId,
      nivel: ganadores[0]?.nivel ?? "",
      modalidad: ganadores[0]?.modalidad ?? "INDIVIDUAL",
      oros: cfg.oros,
      platas: cfg.platas,
      bronces: cfg.bronces,
      menciones: cfg.menciones,
    };

    out.push({ clave: key, ganadores, resumen });
  }

  // Ordenar grupos por área/nivel/modalidad
  out.sort((g1, g2) =>
    g1.resumen.area.localeCompare(g2.resumen.area) ||
    g1.resumen.nivel.localeCompare(g2.resumen.nivel) ||
    g1.resumen.modalidad.localeCompare(g2.resumen.modalidad)
  );

  return {
    publicados_en: new Date().toISOString(),
    fase_final_id: faseFinalId,
    grupos: out,
  };
}

/** Publica (persiste snapshot) en `reportes` + registra en `logs`. */
export async function publicarMedalleroSrv(usuarioId: number, f: FiltroMedallero) {
  const snapshot = await buildMedalleroSnapshot(f);

  const rep = await prisma.reportes.create({
    data: {
      tipo: "MEDALLERO_FINAL",
      titulo: "Publicación medallero final",
      parametros: snapshot as any,       // JSONB
      generado_por: usuarioId,
    },
    select: { id: true, generado_en: true },
  });

  await prisma.logs.create({
    data: {
      entidad: "PUBLICACION_MEDALLERO",
      entidad_id: rep.id,
      campo: "parametros",
      valor_anterior: null,
      valor_nuevo: "Publicación de medallero final",
      usuario_id: usuarioId,
      motivo: "HU-07",
    },
  });

  return { ok: true, publicacion_id: rep.id, generado_en: rep.generado_en, snapshot };
}

/** Lista historial de publicaciones */
export async function historialMedalleroSrv() {
  const list = await prisma.reportes.findMany({
    where: { tipo: "MEDALLERO_FINAL" },
    orderBy: { generado_en: "desc" },
    select: {
      id: true,
      titulo: true,
      generado_en: true,
      generado_por: true,
      parametros: true,
    },
  });
  return { ok: true, total: list.length, data: list };
}

/** Endpoint público: devuelve la última publicación (con filtros opcionales) */
export async function medalleroPublicoSrv(f: FiltroMedallero) {
  const ultimo = await prisma.reportes.findFirst({
    where: { tipo: "MEDALLERO_FINAL" },
    orderBy: { generado_en: "desc" },
    select: { parametros: true, generado_en: true, id: true },
  });

  if (!ultimo) return { ok: true, publicado: false, message: "Aún no hay publicaciones." };

  const snap = ultimo.parametros as SnapshotMedallero;
  const areaId = f.area_id ? Number(f.area_id) : undefined;
  const nivelId = f.nivel_id ? Number(f.nivel_id) : undefined;
  const modalidad = f.modalidad;

  const grupos = snap.grupos.filter(g => {
    const [aId, nId, mod] = g.clave.split("__");
    if (areaId && Number(aId) !== areaId) return false;
    if (nivelId && Number(nId) !== nivelId) return false;
    if (modalidad && mod !== modalidad) return false;
    return true;
  });

  return {
    ok: true,
    publicado: true,
    publicacion_id: ultimo.id,
    generado_en: ultimo.generado_en,
    grupos,
  };
}
