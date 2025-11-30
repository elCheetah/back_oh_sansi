// src/services/aprobacionCalificaciones.service.ts
import { TipoParticipacion } from "@prisma/client";
import prisma from "../config/database";

/**
 * Armamos un ID de lista a partir de la combinación:
 * areaId-nivelId-faseId-evaluadorId-tipo
 */
function buildListaId(params: {
  areaId: number;
  nivelId: number;
  faseId: number;
  evaluadorId: number;
  tipo: TipoParticipacion;
}) {
  const { areaId, nivelId, faseId, evaluadorId, tipo } = params;
  return `${areaId}-${nivelId}-${faseId}-${evaluadorId}-${tipo}`;
}

function parseListaId(listaId: string) {
  const partes = listaId.split("-");
  if (partes.length !== 5) {
    throw new Error("Identificador de lista inválido");
  }

  const [areaIdStr, nivelIdStr, faseIdStr, evaluadorIdStr, tipoStr] = partes;
  const areaId = Number(areaIdStr);
  const nivelId = Number(nivelIdStr);
  const faseId = Number(faseIdStr);
  const evaluadorId = Number(evaluadorIdStr);
  const tipo = tipoStr as TipoParticipacion;

  if (
    !areaId ||
    !nivelId ||
    !faseId ||
    !evaluadorId ||
    !["INDIVIDUAL", "EQUIPO"].includes(tipo)
  ) {
    throw new Error("Identificador de lista inválido");
  }

  return { areaId, nivelId, faseId, evaluadorId, tipo };
}

/**
 * LISTAR LISTAS PENDIENTES
 * Agrupa evaluaciones no validadas por:
 * área + nivel + fase + evaluador + tipo de participación
 *
 * Filtros opcionales:
 *  - areaId: solo esa área
 *  - faseId: solo esa fase (Clasificatoria / Final, etc.)
 */
export async function listarListasPendientesSrv(params?: {
  areaId?: number;
  faseId?: number;
}) {
  const { areaId, faseId } = params ?? {};

  const evaluaciones = await prisma.evaluaciones.findMany({
    where: {
      validado: false,
      ...(faseId ? { fase_id: faseId } : {}),
      participacion: {
        ...(areaId ? { area_id: areaId } : {}),
      },
    },
    include: {
      evaluador: true,
      fase: true,
      participacion: {
        include: {
          area: true,
          nivel: true,
        },
      },
    },
  });

  const grupos = new Map<
    string,
    {
      id: string;
      areaId: number;
      areaNombre: string;
      nivelId: number;
      nivelNombre: string;
      modalidad: "INDIVIDUAL" | "EQUIPO";
      faseId: number;
      faseNombre: string;
      evaluadorId: number;
      evaluadorNombre: string;
      fechaEnviado: Date;
      totalItems: number;
    }
  >();

  for (const ev of evaluaciones) {
    const part = ev.participacion;
    if (!part || !part.area || !part.nivel) continue;

    const key = buildListaId({
      areaId: part.area_id,
      nivelId: part.nivel_id,
      faseId: ev.fase_id,
      evaluadorId: ev.evaluador_id,
      tipo: part.tipo,
    });

    const existente = grupos.get(key);

    const evaluadorNombre = `${ev.evaluador.nombre} ${
      ev.evaluador.ap_paterno ?? ""
    } ${ev.evaluador.ap_materno ?? ""}`.trim();

    const base = {
      id: key,
      areaId: part.area_id,
      areaNombre: part.area.nombre,
      nivelId: part.nivel_id,
      nivelNombre: part.nivel.nombre,
      modalidad: part.tipo, // "INDIVIDUAL" | "EQUIPO"
      faseId: ev.fase_id,
      faseNombre: ev.fase.nombre,
      evaluadorId: ev.evaluador_id,
      evaluadorNombre,
      fechaEnviado: ev.creado_en,
      totalItems: 1,
    };

    if (!existente) {
      grupos.set(key, base);
    } else {
      // max(fechaEnviado), contar items
      if (ev.creado_en > existente.fechaEnviado) {
        existente.fechaEnviado = ev.creado_en;
      }
      existente.totalItems += 1;
    }
  }

  // devolvemos ordenado por fecha (más reciente primero)
  const listas = Array.from(grupos.values()).sort(
    (a, b) => b.fechaEnviado.getTime() - a.fechaEnviado.getTime()
  );

  return listas;
}

/**
 * DETALLE DE UNA LISTA (cabecera + calificaciones)
 */
export async function obtenerDetalleListaSrv(listaId: string) {
  const { areaId, nivelId, faseId, evaluadorId, tipo } = parseListaId(listaId);

  const evaluaciones = await prisma.evaluaciones.findMany({
    where: {
      evaluador_id: evaluadorId,
      fase_id: faseId,
      validado: false,
      participacion: {
        area_id: areaId,
        nivel_id: nivelId,
        tipo,
      },
    },
    include: {
      participacion: {
        include: {
          olimpista: true,
          equipo: true,
          area: true,
          nivel: true,
        },
      },
      evaluador: true,
      fase: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (!evaluaciones.length) {
    return null;
  }

  const primero = evaluaciones[0];
  const part0 = primero.participacion!;
  const header = {
    area: part0.area!.nombre,
    nivel: part0.nivel!.nombre,
    modalidad: part0.tipo === "INDIVIDUAL" ? "Individual" : "Equipo",
    evaluador: `${primero.evaluador.nombre} ${
      primero.evaluador.ap_paterno ?? ""
    } ${primero.evaluador.ap_materno ?? ""}`.trim(),
    fase: primero.fase.nombre,
  };

  const calificaciones = evaluaciones.map((ev) => {
    const part = ev.participacion!;
    let nombre = "";
    if (part.tipo === "INDIVIDUAL" && part.olimpista) {
      nombre = `${part.olimpista.nombre} ${
        part.olimpista.ap_paterno ?? ""
      } ${part.olimpista.ap_materno ?? ""}`.trim();
    } else if (part.tipo === "EQUIPO" && part.equipo) {
      nombre = part.equipo.nombre;
    }

    const iniciales = nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("");

    const codigo = String(part.id);
    const notaNum = Number(ev.nota ?? 0);

    // REGLA DE NEGOCIO PARA ESTADO:
    // - Si la participación está descalificada → "Descalificado"
    // - Si nota >= 60 → "Clasificado"
    // - Si nota < 60 → "No clasificado"
    let estado: "Clasificado" | "No clasificado" | "Descalificado";
    if (part.estado === "DESCALIFICADO") {
      estado = "Descalificado";
    } else if (notaNum >= 60) {
      estado = "Clasificado";
    } else {
      estado = "No clasificado";
    }

    return {
      id: ev.id,
      iniciales,
      nombre,
      codigo,
      estado,
      nota: notaNum,
      observacion: ev.comentario ?? "",
    };
  });

  return { header, calificaciones };
}

/**
 * APROBAR LISTA:
 * - Marca todas las evaluaciones del grupo como validado = true
 * - Registra log con quien aprobó
 */
export async function aprobarListaSrv(listaId: string, usuarioId: number) {
  const { areaId, nivelId, faseId, evaluadorId, tipo } = parseListaId(listaId);

  const resultado = await prisma.$transaction(async (tx) => {
    const update = await tx.evaluaciones.updateMany({
      where: {
        evaluador_id: evaluadorId,
        fase_id: faseId,
        validado: false,
        participacion: {
          area_id: areaId,
          nivel_id: nivelId,
          tipo,
        },
      },
      data: {
        validado: true,
        ultima_modificacion: new Date(),
      },
    });

    await tx.logs.create({
      data: {
        entidad: "APROBACION_CALIFICACIONES",
        entidad_id: faseId,
        campo: "APROBAR_LISTA",
        valor_nuevo: JSON.stringify({
          areaId,
          nivelId,
          faseId,
          evaluadorId,
          tipo,
        }),
        usuario_id: usuarioId,
        motivo: null,
      },
    });

    return update.count;
  });

  return { cantidad: resultado };
}

/**
 * RECHAZAR LISTA:
 * - NO toca las evaluaciones (siguen como validado = false)
 * - Guarda el motivo en Logs
 */
export async function rechazarListaSrv(
  listaId: string,
  usuarioId: number,
  justificacion: string
) {
  const { areaId, nivelId, faseId, evaluadorId, tipo } = parseListaId(listaId);

  await prisma.logs.create({
    data: {
      entidad: "APROBACION_CALIFICACIONES",
      entidad_id: faseId,
      campo: "RECHAZAR_LISTA",
      valor_nuevo: JSON.stringify({
        areaId,
        nivelId,
        faseId,
        evaluadorId,
        tipo,
      }),
      usuario_id: usuarioId,
      motivo: justificacion,
    },
  });

  return { ok: true };
}
