import { EstadoFase, TipoFase } from "@prisma/client";
import prisma from "../config/database";

const FASE_CLASIF = "Clasificación";
const FASE_FINAL = "Final";

// ⚠️ Ajusta esto según tu realidad (p.ej. 2024, 2025 o desde env)
const GESTION_ACTUAL = 2025;

/** Asegura que existan ambas fases en BD para la gestión actual */
async function ensureFases() {
  const fases = await prisma.fases.findMany({
    where: { gestion: GESTION_ACTUAL },
  });
  const nombres = fases.map((f) => f.nombre);

  if (!nombres.includes(FASE_CLASIF)) {
    await prisma.fases.create({
      data: {
        nombre: FASE_CLASIF,
        gestion: GESTION_ACTUAL,
        estado: EstadoFase.PENDIENTE,
        tipo: TipoFase.CLASIFICATORIA,
      },
    });
  }

  if (!nombres.includes(FASE_FINAL)) {
    await prisma.fases.create({
      data: {
        nombre: FASE_FINAL,
        gestion: GESTION_ACTUAL,
        estado: EstadoFase.PENDIENTE,
        tipo: TipoFase.FINAL,
      },
    });
  }
}

type Snapshot = {
  clasif: { id: number; estado: EstadoFase };
  final: { id: number; estado: EstadoFase };
};

/** Lee estados actuales de ambas fases */
async function getSnapshot(): Promise<Snapshot> {
  await ensureFases();

  const clasif = await prisma.fases.findFirst({
    where: { nombre: FASE_CLASIF, gestion: GESTION_ACTUAL },
    select: { id: true, estado: true },
  });

  const final = await prisma.fases.findFirst({
    where: { nombre: FASE_FINAL, gestion: GESTION_ACTUAL },
    select: { id: true, estado: true },
  });

  if (!clasif || !final) {
    throw new Error(
      "No se encontraron las fases configuradas para la gestión actual."
    );
  }

  return { clasif, final };
}

/** Mapea estados a un estado general tipo “radio” */
function snapshotToRadio(s: Snapshot) {
  if (
    s.clasif.estado === EstadoFase.PENDIENTE &&
    s.final.estado === EstadoFase.PENDIENTE
  )
    return "NO_INICIADA";

  if (s.clasif.estado === EstadoFase.EN_EJECUCION) return "CLASIFICACION";

  if (
    s.clasif.estado === EstadoFase.FINALIZADA &&
    s.final.estado === EstadoFase.EN_EJECUCION
  )
    return "FINAL";

  if (
    s.clasif.estado === EstadoFase.FINALIZADA &&
    s.final.estado === EstadoFase.FINALIZADA
  )
    return "CONCLUIDA";

  return "NO_INICIADA";
}

/** Revisa si ya se publicaron resultados */
async function resultadosPublicados() {
  const log = await prisma.logs.findFirst({
    where: { entidad: "FASES", campo: "PUBLICAR" },
    orderBy: { id: "desc" },
  });
  return !!log;
}

/** Estado actual completo */
export async function getEstadoActualSrv() {
  const s = await getSnapshot();
  const radio = snapshotToRadio(s);
  const publicados = await resultadosPublicados();

  return {
    estado: radio,
    resultadosPublicados: publicados,
    botones: {
      puedeAbrir: radio === "NO_INICIADA" || radio === "CLASIFICACION",
      puedeCerrar: radio === "CLASIFICACION" || radio === "FINAL",
      puedePublicar: radio === "FINAL",
    },
    radios: ["NO_INICIADA", "CLASIFICACION", "FINAL", "CONCLUIDA"],
  };
}

/** Registra en logs */
async function logFase(accion: string, fase: string, admin: string) {
  await prisma.logs.create({
    data: {
      entidad: "FASES",
      campo: accion,
      valor_nuevo: fase,
      usuario_id: 1, // TODO: reemplazar por id admin real
      motivo: admin,
    },
  });
}

/** Abrir fase */
export async function abrirFaseSrv(
  admin: string,
  fase?: "CLASIFICACION" | "FINAL"
) {
  const s = await getSnapshot();

  if (fase === "FINAL") {
    if (s.clasif.estado !== EstadoFase.FINALIZADA) {
      throw new Error("Debe finalizar la fase de Clasificación primero.");
    }

    await prisma.fases.update({
      where: { id: s.final.id },
      data: { estado: EstadoFase.EN_EJECUCION },
    });
    await logFase("ABRIR", "FINAL", admin);
    return getEstadoActualSrv();
  }

  if (s.clasif.estado === EstadoFase.PENDIENTE) {
    await prisma.fases.update({
      where: { id: s.clasif.id },
      data: { estado: EstadoFase.EN_EJECUCION },
    });
    await logFase("ABRIR", "CLASIFICACION", admin);
  }

  return getEstadoActualSrv();
}

/** Cerrar fase */
export async function cerrarFaseSrv(admin: string) {
  const s = await getSnapshot();

  if (s.clasif.estado === EstadoFase.EN_EJECUCION) {
    await prisma.fases.update({
      where: { id: s.clasif.id },
      data: { estado: EstadoFase.FINALIZADA },
    });
    await logFase("CERRAR", "CLASIFICACION", admin);
  } else if (s.final.estado === EstadoFase.EN_EJECUCION) {
    await prisma.fases.update({
      where: { id: s.final.id },
      data: { estado: EstadoFase.FINALIZADA },
    });
    await logFase("CERRAR", "FINAL", admin);
  } else {
    throw new Error("No se puede cerrar en el estado actual.");
  }

  return getEstadoActualSrv();
}

/** Publicar resultados */
export async function publicarResultadosSrv(admin: string) {
  const s = await getSnapshot();
  const radio = snapshotToRadio(s);
  if (radio !== "FINAL") {
    throw new Error("Solo se pueden publicar resultados en Fase final.");
  }

  await logFase("PUBLICAR", "FINAL", admin);
  return getEstadoActualSrv();
}

/** Historial */
export async function listarHistorialSrv() {
  const logs = await prisma.logs.findMany({
    where: { entidad: "FASES" },
    orderBy: { id: "desc" },
    select: {
      id: true,
      campo: true,
      valor_nuevo: true,
      motivo: true,
      fecha_cambio: true,
    },
  });

  return logs.map((l) => ({
    id: l.id,
    accion: l.campo,
    fase: l.valor_nuevo,
    administrador: l.motivo || "ADMIN",
    fecha: l.fecha_cambio,
  }));
}
