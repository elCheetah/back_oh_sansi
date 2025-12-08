// src/services/gestionFases.service.ts
import { EstadoFase, TipoFase } from "@prisma/client";
import prisma from "../config/database";

export type AccionFase = "ABRIR" | "CERRAR" | "PUBLICAR" | "QUITAR_PUBLICACION";

export interface FaseResumenDTO {
  id: number;
  nombre: string;
  tipo: TipoFase;
  descripcion: string | null;
  inicio: Date | null;
  fin: Date | null;
  estado: EstadoFase;
  correos_enviados: boolean;
  resultados_publicados: boolean;
  gestion: number;
}

export interface GestionFasesDTO {
  gestion: number;
  descripcion: string | null;
  inicio: Date | null;
  fin: Date | null;
  fases: FaseResumenDTO[];
}

interface GestionPayload {
  descripcion: string;
  inicio: Date;
  fin: Date;
}

// Helper para logs
async function registrarLog(params: {
  entidad_id: number;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_id: number;
  motivo?: string;
}) {
  const { entidad_id, campo, valor_anterior, valor_nuevo, usuario_id, motivo } =
    params;

  await prisma.logs.create({
    data: {
      entidad: "fase", // SOLO una palabra
      entidad_id,
      campo,
      valor_anterior,
      valor_nuevo,
      usuario_id,
      motivo: motivo || undefined,
    },
  });
}

// Mapea Fases a DTO compacto
function mapFaseToDTO(fase: any): FaseResumenDTO {
  return {
    id: fase.id,
    nombre: fase.nombre,
    tipo: fase.tipo,
    descripcion: fase.descripcion ?? null,
    inicio: fase.inicio ?? null,
    fin: fase.fin ?? null,
    estado: fase.estado,
    correos_enviados: fase.correos_enviados,
    resultados_publicados: fase.resultados_publicados,
    gestion: fase.gestion,
  };
}

/**
 * Crear una "gestión" con sus 2 fases (CLASIFICATORIA y FINAL) en un solo paso.
 * - Por año (gestion) solo se permite una gestión.
 * - El año se toma del servidor (new Date().getFullYear()).
 */
export async function crearGestionConFases(
  payload: GestionPayload,
  usuarioId: number
): Promise<GestionFasesDTO> {
  const gestion = new Date().getFullYear();

  // Validaciones básicas de fechas
  if (!payload.descripcion || !payload.descripcion.trim()) {
    throw new Error("La descripción de la gestión es obligatoria.");
  }

  if (!payload.inicio || !payload.fin) {
    throw new Error("Las fechas de inicio y fin son obligatorias.");
  }

  if (payload.fin < payload.inicio) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }

  // Verificar si ya existe alguna fase para esta gestión
  const existente = await prisma.fases.findFirst({
    where: { gestion },
    select: { id: true },
  });

  if (existente) {
    throw new Error(`Ya existe una gestión registrada para el año ${gestion}.`);
  }

  const descripcionGestion = payload.descripcion.trim();
  const inicio = payload.inicio;
  const fin = payload.fin;

  return await prisma.$transaction(async (tx) => {
    // Crear fase CLASIFICATORIA
    const faseClasificatoria = await tx.fases.create({
      data: {
        nombre: "Clasificatoria",
        descripcion: descripcionGestion,
        inicio,
        fin,
        estado: EstadoFase.PENDIENTE,
        gestion,
        tipo: TipoFase.CLASIFICATORIA,
      },
    });

    // Crear fase FINAL
    const faseFinal = await tx.fases.create({
      data: {
        nombre: "Final",
        descripcion: descripcionGestion,
        inicio,
        fin,
        estado: EstadoFase.PENDIENTE,
        gestion,
        tipo: TipoFase.FINAL,
      },
    });

    // Logs de creación
    await tx.logs.createMany({
      data: [
        {
          entidad: "fase",
          entidad_id: faseClasificatoria.id,
          campo: "crear",
          valor_anterior: null,
          valor_nuevo: JSON.stringify({
            gestion,
            tipo: "CLASIFICATORIA",
            nombre: "Clasificatoria",
          }),
          usuario_id: usuarioId,
          motivo: `Creación de fase CLASIFICATORIA para gestión ${gestion}.`,
        },
        {
          entidad: "fase",
          entidad_id: faseFinal.id,
          campo: "crear",
          valor_anterior: null,
          valor_nuevo: JSON.stringify({
            gestion,
            tipo: "FINAL",
            nombre: "Final",
          }),
          usuario_id: usuarioId,
          motivo: `Creación de fase FINAL para gestión ${gestion}.`,
        },
      ],
    });

    const fasesDTO: FaseResumenDTO[] = [
      mapFaseToDTO(faseClasificatoria),
      mapFaseToDTO(faseFinal),
    ];

    const gestionDTO: GestionFasesDTO = {
      gestion,
      descripcion: descripcionGestion,
      inicio,
      fin,
      fases: fasesDTO,
    };

    return gestionDTO;
  });
}

/**
 * Listar TODAS las gestiones con sus fases.
 * SIN límites de años. El front puede filtrar por rango si quiere.
 */
export async function listarGestionesFases(): Promise<GestionFasesDTO[]> {
  const fases = await prisma.fases.findMany({
    orderBy: [{ gestion: "desc" }, { tipo: "asc" }, { id: "asc" }],
  });

  const mapa = new Map<number, GestionFasesDTO>();

  for (const f of fases) {
    const faseDTO = mapFaseToDTO(f);

    if (!mapa.has(f.gestion)) {
      mapa.set(f.gestion, {
        gestion: f.gestion,
        descripcion: f.descripcion ?? null,
        inicio: f.inicio ?? null,
        fin: f.fin ?? null,
        fases: [faseDTO],
      });
    } else {
      const existente = mapa.get(f.gestion)!;
      existente.fases.push(faseDTO);

      // Usar la fase CLASIFICATORIA como referencia principal de la gestión
      if (f.tipo === TipoFase.CLASIFICATORIA) {
        existente.descripcion = f.descripcion ?? existente.descripcion;
        existente.inicio = f.inicio ?? existente.inicio;
        existente.fin = f.fin ?? existente.fin;
      }
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.gestion - a.gestion);
}

/**
 * Actualizar datos de la gestión (nombre / fechas) para las 2 fases de un año.
 * No actualiza campos individuales de las fases, sino la "gestión".
 */
export async function actualizarGestionFases(
  gestion: number,
  cambios: { descripcion?: string; inicio?: Date; fin?: Date },
  usuarioId: number
): Promise<GestionFasesDTO> {
  if (!cambios.descripcion && !cambios.inicio && !cambios.fin) {
    throw new Error("No se recibió ningún cambio para actualizar.");
  }

  const fases = await prisma.fases.findMany({
    where: { gestion },
    orderBy: [{ tipo: "asc" }, { id: "asc" }],
  });

  if (fases.length === 0) {
    throw new Error(`No se encontraron fases para la gestión ${gestion}.`);
  }

  if (cambios.inicio && cambios.fin && cambios.fin < cambios.inicio) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }

  return await prisma.$transaction(async (tx) => {
    const nuevasFases = [];

    for (const fase of fases) {
      const dataUpdate: any = {};
      const logsPendientes: {
        campo: string;
        valor_anterior: string | null;
        valor_nuevo: string | null;
        motivo: string;
      }[] = [];

      if (
        typeof cambios.descripcion === "string" &&
        cambios.descripcion.trim() !== "" &&
        cambios.descripcion !== fase.descripcion
      ) {
        dataUpdate.descripcion = cambios.descripcion.trim();
        logsPendientes.push({
          campo: "descripcion",
          valor_anterior: fase.descripcion ?? null,
          valor_nuevo: cambios.descripcion.trim(),
          motivo: `Actualización de descripción de fase ${fase.tipo} para gestión ${gestion}.`,
        });
      }

      if (
        cambios.inicio &&
        (!fase.inicio || cambios.inicio.getTime() !== fase.inicio.getTime())
      ) {
        dataUpdate.inicio = cambios.inicio;
        logsPendientes.push({
          campo: "inicio",
          valor_anterior: fase.inicio ? fase.inicio.toISOString() : null,
          valor_nuevo: cambios.inicio.toISOString(),
          motivo: `Actualización de fecha de inicio de fase ${fase.tipo} para gestión ${gestion}.`,
        });
      }

      if (
        cambios.fin &&
        (!fase.fin || cambios.fin.getTime() !== fase.fin.getTime())
      ) {
        dataUpdate.fin = cambios.fin;
        logsPendientes.push({
          campo: "fin",
          valor_anterior: fase.fin ? fase.fin.toISOString() : null,
          valor_nuevo: cambios.fin.toISOString(),
          motivo: `Actualización de fecha de fin de fase ${fase.tipo} para gestión ${gestion}.`,
        });
      }

      // Si no hay cambios específicos para esta fase, mantenerla tal cual
      if (Object.keys(dataUpdate).length === 0) {
        nuevasFases.push(fase);
        continue;
      }

      const faseActualizada = await tx.fases.update({
        where: { id: fase.id },
        data: dataUpdate,
      });

      for (const log of logsPendientes) {
        await registrarLog({
          entidad_id: fase.id,
          campo: log.campo,
          valor_anterior: log.valor_anterior,
          valor_nuevo: log.valor_nuevo,
          usuario_id: usuarioId,
          motivo: log.motivo,
        });
      }

      nuevasFases.push(faseActualizada);
    }

    // Reconstruir DTO de gestión
    const fasesDTO = nuevasFases.map(mapFaseToDTO);
    const faseReferencia =
      nuevasFases.find((f) => f.tipo === TipoFase.CLASIFICATORIA) ??
      nuevasFases[0];

    return {
      gestion,
      descripcion: faseReferencia.descripcion ?? null,
      inicio: faseReferencia.inicio ?? null,
      fin: faseReferencia.fin ?? null,
      fases: fasesDTO,
    };
  });
}

/**
 * Gestionar una fase individual por acción:
 * - ABRIR  => estado EN_EJECUCION
 * - CERRAR => estado FINALIZADA
 * - PUBLICAR => resultados_publicados = true (solo si FINALIZADA)
 * - QUITAR_PUBLICACION => resultados_publicados = false
 */
export async function gestionarFasePorAccion(
  faseId: number,
  accion: AccionFase,
  usuarioId: number,
  motivo?: string
): Promise<FaseResumenDTO> {
  const fase = await prisma.fases.findUnique({
    where: { id: faseId },
  });

  if (!fase) {
    throw new Error("La fase indicada no existe.");
  }

  let dataUpdate: any = {};
  let campo: string | null = null;
  let valorAnterior: string | null = null;
  let valorNuevo: string | null = null;
  let motivoLog: string = motivo || "";

  switch (accion) {
    case "ABRIR": {
      if (fase.estado === EstadoFase.EN_EJECUCION) {
        throw new Error("La fase ya se encuentra en ejecución.");
      }
      if (fase.estado === EstadoFase.CANCELADA) {
        throw new Error("No es posible abrir una fase cancelada.");
      }

      campo = "estado";
      valorAnterior = fase.estado;
      valorNuevo = EstadoFase.EN_EJECUCION;

      dataUpdate.estado = EstadoFase.EN_EJECUCION;
      if (!motivoLog) {
        motivoLog = `Se abrió la fase ${fase.tipo} de la gestión ${fase.gestion}.`;
      }
      break;
    }

    case "CERRAR": {
      if (fase.estado === EstadoFase.FINALIZADA) {
        throw new Error("La fase ya se encuentra finalizada.");
      }
      if (fase.estado === EstadoFase.PENDIENTE) {
        throw new Error("La fase debe estar en ejecución para poder finalizarla.");
      }
      if (fase.estado === EstadoFase.CANCELADA) {
        throw new Error("No es posible finalizar una fase cancelada.");
      }

      campo = "estado";
      valorAnterior = fase.estado;
      valorNuevo = EstadoFase.FINALIZADA;

      dataUpdate.estado = EstadoFase.FINALIZADA;
      if (!motivoLog) {
        motivoLog = `Se finalizó la fase ${fase.tipo} de la gestión ${fase.gestion}.`;
      }
      break;
    }

    case "PUBLICAR": {
      if (fase.estado !== EstadoFase.FINALIZADA) {
        throw new Error("La fase debe estar finalizada para publicar resultados.");
      }
      if (fase.resultados_publicados) {
        throw new Error("Los resultados de esta fase ya están publicados.");
      }

      campo = "resultados_publicados";
      valorAnterior = String(fase.resultados_publicados);
      valorNuevo = "true";

      dataUpdate.resultados_publicados = true;
      if (!motivoLog) {
        motivoLog = `Se publicaron los resultados de la fase ${fase.tipo} de la gestión ${fase.gestion}.`;
      }
      break;
    }

    case "QUITAR_PUBLICACION": {
      if (!fase.resultados_publicados) {
        throw new Error("Los resultados de esta fase no están publicados.");
      }

      campo = "resultados_publicados";
      valorAnterior = String(fase.resultados_publicados);
      valorNuevo = "false";

      dataUpdate.resultados_publicados = false;
      if (!motivoLog) {
        motivoLog = `Se retiró la publicación de resultados de la fase ${fase.tipo} de la gestión ${fase.gestion}.`;
      }
      break;
    }

    default:
      throw new Error("Acción no válida para la gestión de fase.");
  }

  if (!campo) {
    throw new Error("No se detectó ningún cambio para la fase.");
  }

  const faseActualizada = await prisma.$transaction(async (tx) => {
    const f = await tx.fases.update({
      where: { id: faseId },
      data: dataUpdate,
    });

    await registrarLog({
      entidad_id: faseId,
      campo,
      valor_anterior: valorAnterior,
      valor_nuevo: valorNuevo,
      usuario_id: usuarioId,
      motivo: motivoLog,
    });

    return f;
  });

  return mapFaseToDTO(faseActualizada);
}
