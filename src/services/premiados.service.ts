// src/services/premiados.service.ts
import { Prisma } from "@prisma/client";
import prisma from "../config/database";
import { FiltroPremiados, ItemPremiado, PremiadosResponse } from "../types/premiados.types";

/**
 * Obtiene el nombre de la fase "Final". Si no existe, devuelve null.
 */
async function getFaseFinalId(): Promise<number | null> {
  const fase = await prisma.fases.findFirst({
    where: { nombre: { equals: "Final", mode: "insensitive" } },
    select: { id: true },
  });
  return fase?.id ?? null;
}

/**
 * Lee config de medallas por área y nivel.
 */
async function getConfigMedallas(areaId: number, nivelId: number) {
  const cfg = await prisma.configMedallas.findUnique({
    where: { area_id_nivel_id: { area_id: areaId, nivel_id: nivelId } },
    select: { oros: true, platas: true, bronces: true, menciones: true },
  });
  // Si no hay config, por defecto 1-1-1-0
  return cfg ?? { oros: 1, platas: 1, bronces: 1, menciones: 0 };
}

/**
 * Aplica ranking y distinciones dentro de un grupo (misma área+nivel).
 */
function asignarDistinciones(
  items: ItemPremiado[],
  cfg: { oros: number; platas: number; bronces: number; menciones: number }
): ItemPremiado[] {
  // orden por nota desc
  items.sort((a, b) => b.nota - a.nota);

  let pos = 1;
  let oro = cfg.oros, plata = cfg.platas, bronce = cfg.bronces, menc = cfg.menciones;

  return items.map((it) => {
    let dist: string | null = null;
    if (oro > 0) { dist = "Medalla de oro"; oro--; }
    else if (plata > 0) { dist = "Medalla de plata"; plata--; }
    else if (bronce > 0) { dist = "Medalla de bronce"; bronce--; }
    else if (menc > 0) { dist = "Mención"; menc--; }

    const out: ItemPremiado = { ...it, posicion: pos, distincion: dist };
    pos++;
    return out;
  });
}

/**
 * Servicio principal: lista de premiados con filtros y paginación.
 * Regla: Usamos notas de la fase "Final", solo evaluaciones validadas,
 * y excluimos Participacion.estado = "DESCALIFICADO".
 */
export async function listarPremiadosSrv(f: FiltroPremiados): Promise<PremiadosResponse> {
  // Normalizar filtros
  const page = Math.max(1, Number(f.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(f.pageSize ?? 10)));
  const areaId = f.area_id ? Number(f.area_id) : undefined;
  const nivelId = f.nivel_id ? Number(f.nivel_id) : undefined;
  const modalidad = f.modalidad;
  const search = (f.search ?? "").trim();

  const faseFinalId = await getFaseFinalId();
  if (!faseFinalId) {
    return { ok: true, total: 0, page, pageSize, data: [] };
  }

  // 1) Traer participaciones válidas y su contexto (área, nivel, modalidad, etc.)
  const whereParticipacion: Prisma.ParticipacionWhereInput = {
    estado: { not: "DESCALIFICADO" },
    ...(areaId ? { area_id: areaId } : {}),
    ...(nivelId ? { nivel_id: nivelId } : {}),
    ...(modalidad ? { tipo: modalidad } : {}),
  };

  const participaciones = await prisma.participacion.findMany({
    where: whereParticipacion,
    select: {
      id: true,
      tipo: true,
      estado: true,
      area: { select: { id: true, nombre: true } },
      nivel: { select: { id: true, nombre: true } },
      // Individual
      olimpista: {
        select: {
          nombre: true,
          ap_paterno: true,
          ap_materno: true,
          numero_documento: true,
          unidad_educativa: true,
        },
      },
      // Equipo
      equipo: {
        select: { nombre: true },
      },
    },
  });

  if (participaciones.length === 0) {
    return { ok: true, total: 0, page, pageSize, data: [] };
  }

  const ids = participaciones.map((p) => p.id);

  // 2) Promedio de notas validadas en la fase Final por participacion_id
  const notas = await prisma.evaluaciones.groupBy({
    by: ["participacion_id"],
    where: {
      participacion_id: { in: ids },
      fase_id: faseFinalId,
      validado: true,
    },
    _avg: { nota: true },
  });

  const notaMap = new Map<number, number>();
  notas.forEach((n) => {
    // _avg.nota puede venir como Prisma.Decimal; convertir a number
    const avg = Number(n._avg.nota ?? 0);
    notaMap.set(n.participacion_id, avg);
  });

  // 3) Construir items base
  const base: ItemPremiado[] = participaciones.map((p) => {
    const isInd = p.tipo === "INDIVIDUAL";
    const nombre =
      isInd
        ? [p.olimpista?.nombre, p.olimpista?.ap_paterno, p.olimpista?.ap_materno]
            .filter(Boolean)
            .join(" ")
        : (p.equipo?.nombre ?? "Equipo");
    const ci = isInd ? p.olimpista?.numero_documento ?? null : null;
    const ue = isInd ? p.olimpista?.unidad_educativa ?? null : null;

    return {
      id: p.id,
      posicion: 0,
      nombreCompleto: nombre,
      ci,
      equipo: isInd ? null : (p.equipo?.nombre ?? null),
      unidadEducativa: ue,
      area: p.area.nombre,
      nivel: p.nivel.nombre,
      modalidad: p.tipo,
      estado: p.estado,
      nota: Number(notaMap.get(p.id) ?? 0),
      distincion: null,
      certificado: null,
    };
  });

  // 4) Filtro por búsqueda (nombre/equipo/CI/UE)
  const searchLC = search.toLowerCase();
  const filtrados = searchLC
    ? base.filter((x) =>
        [
          x.nombreCompleto,
          x.equipo ?? "",
          x.ci ?? "",
          x.unidadEducativa ?? "",
          x.area,
          x.nivel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchLC)
      )
    : base;

  // 5) Agrupar por (area, nivel) y asignar distinciones por grupo
  const groups = new Map<string, ItemPremiado[]>();
  for (const it of filtrados) {
    const key = `${it.area}__${it.nivel}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  let conMedallas: ItemPremiado[] = [];
  for (const [key, arr] of groups) {
    // recuperar ids reales de area/nivel para este grupo
    // como no los tenemos aquí, reducimos la consulta:
    const [areaName, nivelName] = key.split("__");
    // buscar ids de catálogo (una sola vez por nombre)
    const [areaCat, nivelCat] = await Promise.all([
      prisma.areas.findFirst({ where: { nombre: areaName }, select: { id: true } }),
      prisma.niveles.findFirst({ where: { nombre: nivelName }, select: { id: true } }),
    ]);
    const cfg = (areaCat && nivelCat)
      ? await getConfigMedallas(areaCat.id, nivelCat.id)
      : { oros: 1, platas: 1, bronces: 1, menciones: 0 };

    conMedallas = conMedallas.concat(asignarDistinciones(arr, cfg));
  }

  // Orden global para mostrar (área, nivel, posición)
  conMedallas.sort((a, b) =>
    a.area.localeCompare(b.area) ||
    a.nivel.localeCompare(b.nivel) ||
    a.posicion - b.posicion
  );

  const total = conMedallas.length;
  const start = (page - 1) * pageSize;
  const paged = conMedallas.slice(start, start + pageSize);

  return { ok: true, total, page, pageSize, data: paged };
}

/**
 * Exportación a Excel (XLSX) y PDF simples.
 * Devuelve { buffer, filename, mime } para que el controller envíe archivo.
 */
export async function exportarPremiadosSrv(
  f: FiltroPremiados,
  formato: "excel" | "pdf"
): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  const lista = await listarPremiadosSrv({ ...f, page: 1, pageSize: 10000 });

  if (formato === "excel") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Premiados");
    ws.columns = [
      { header: "Posición", key: "posicion", width: 10 },
      { header: "Nombre/Equipo", key: "nombre", width: 35 },
      { header: "CI", key: "ci", width: 15 },
      { header: "Unidad Educativa", key: "ue", width: 30 },
      { header: "Área", key: "area", width: 20 },
      { header: "Nivel", key: "nivel", width: 15 },
      { header: "Modalidad", key: "mod", width: 12 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Nota", key: "nota", width: 10 },
      { header: "Distinción", key: "dist", width: 18 },
    ];
    lista.data.forEach((r) =>
      ws.addRow({
        posicion: r.posicion,
        nombre: r.nombreCompleto,
        ci: r.ci ?? "",
        ue: r.unidadEducativa ?? "",
        area: r.area,
        nivel: r.nivel,
        mod: r.modalidad,
        estado: r.estado,
        nota: r.nota,
        dist: r.distincion ?? "",
      })
    );
    const buffer = await wb.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      filename: "premiados.xlsx",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  // PDF
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(14).text("Lista de premiados", { align: "center" });
  doc.moveDown();

  lista.data.forEach((r) => {
    doc
      .fontSize(10)
      .text(
        `${r.posicion}. ${r.nombreCompleto}  ` +
          `[${r.modalidad}]  ` +
          `Área: ${r.area}  Nivel: ${r.nivel}  ` +
          `Nota: ${r.nota}  ${r.distincion ? " - " + r.distincion : ""}`
      );
  });

  doc.end();
  const buffer = await done;
  return { buffer, filename: "premiados.pdf", mime: "application/pdf" };
}
