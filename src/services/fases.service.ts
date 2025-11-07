import { EstadoFase } from "@prisma/client";
import prisma from "../config/database";

const FASE_CLASIF = "Clasificación";
const FASE_FINAL = "Final";

/** Asegura que existan ambas fases en BD */
async function ensureFases() {
  const fases = await prisma.fases.findMany();
  const nombres = fases.map(f => f.nombre);

  if (!nombres.includes(FASE_CLASIF)) {
    await prisma.fases.create({ data: { nombre: FASE_CLASIF, estado: "PENDIENTE" } });
  }
  if (!nombres.includes(FASE_FINAL)) {
    await prisma.fases.create({ data: { nombre: FASE_FINAL, estado: "PENDIENTE" } });
  }
}

/** Lee estados actuales de ambas fases */
async function getSnapshot() {
  await ensureFases();
  const clasif = await prisma.fases.findUnique({
    where: { nombre: FASE_CLASIF },
    select: { id: true, estado: true },
  });
  const final = await prisma.fases.findUnique({
    where: { nombre: FASE_FINAL },
    select: { id: true, estado: true },
  });
  return { clasif: clasif!, final: final! };
}

/** Mapea estados a un estado general tipo “radio” */
function snapshotToRadio(s: { clasif: any; final: any }) {
  if (s.clasif.estado === "PENDIENTE" && s.final.estado === "PENDIENTE") return "NO_INICIADA";
  if (s.clasif.estado === "EN_EJECUCION") return "CLASIFICACION";
  if (s.clasif.estado === "FINALIZADA" && s.final.estado === "EN_EJECUCION") return "FINAL";
  if (s.clasif.estado === "FINALIZADA" && s.final.estado === "FINALIZADA") return "CONCLUIDA";
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
      usuario_id: 1, // reemplazar por id admin real
      motivo: admin,
    },
  });
}

/** Abrir fase */
export async function abrirFaseSrv(admin: string, fase?: "CLASIFICACION" | "FINAL") {
  const s = await getSnapshot();

  if (fase === "FINAL") {
    if (s.clasif.estado !== "FINALIZADA") throw new Error("Debe finalizar la fase de Clasificación primero.");

    await prisma.fases.update({ where: { id: s.final.id }, data: { estado: "EN_EJECUCION" } });
    await logFase("ABRIR", "FINAL", admin);
    return getEstadoActualSrv();
  }

  if (s.clasif.estado === "PENDIENTE") {
    await prisma.fases.update({ where: { id: s.clasif.id }, data: { estado: "EN_EJECUCION" } });
    await logFase("ABRIR", "CLASIFICACION", admin);
  }

  return getEstadoActualSrv();
}

/** Cerrar fase */
export async function cerrarFaseSrv(admin: string) {
  const s = await getSnapshot();

  if (s.clasif.estado === "EN_EJECUCION") {
    await prisma.fases.update({ where: { id: s.clasif.id }, data: { estado: "FINALIZADA" } });
    await logFase("CERRAR", "CLASIFICACION", admin);
  } else if (s.final.estado === "EN_EJECUCION") {
    await prisma.fases.update({ where: { id: s.final.id }, data: { estado: "FINALIZADA" } });
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
  if (radio !== "FINAL") throw new Error("Solo se pueden publicar resultados en Fase final.");

  await logFase("PUBLICAR", "FINAL", admin);
  return getEstadoActualSrv();
}

/** Historial */
export async function listarHistorialSrv() {
  const logs = await prisma.logs.findMany({
    where: { entidad: "FASES" },
    orderBy: { id: "desc" },
    select: { id: true, campo: true, valor_nuevo: true, motivo: true, fecha_cambio: true },
  });

  return logs.map(l => ({
    id: l.id,
    accion: l.campo,
    fase: l.valor_nuevo,
    administrador: l.motivo || "ADMIN",
    fecha: l.fecha_cambio,
  }));
}
