// src/services/aprobarCalificaciones.service.ts
import prisma from "../config/database";
import {
  ModalidadCategoria,
  TipoFase,
  Rol,
  EstadoParticipacion,
} from "@prisma/client";

/**
 * =========================
 * Tipos de respuesta genérica
 * =========================
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  message?: string;
  data?: T;
}

/**
 * =========================
 * DTOs para el FRONT
 * =========================
 */

// Resumen de categoría + evaluadores (para la primera pantalla)
export interface ResumenCategoriaAprobacionDTO {
  asignado: boolean;
  message?: string;
  categoria?: {
    idCategoria: number;
    gestion: number;
    area: string;
    nivel: string;
    modalidad: ModalidadCategoria;
  };
  evaluadores?: {
    idEvaluador: number;
    nombreCompleto: string;
    fases: {
      tipoFase: TipoFase; // CLASIFICATORIA | FINAL
      totalAsignados: number;
      totalConEvaluacion: number;
      totalAprobadas: number;
      totalPendientes: number;
    }[];
  }[];
}
export interface ParticipanteCategoriaResponsableDTO {
  idParticipacion: number;
  nombreParticipante: string;
  nota: number | null;
  comentario: string | null;
  estado: "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";
}
// Tabla de participantes para un evaluador + fase
export interface FilaAprobacionDTO {
  idEvaluacion: number | null; // null → no hay evaluación, no se puede aprobar/rechazar
  nombreParticipante: string;
  nota: number | null;
  validado: boolean | null; // null cuando no hay evaluación
}

export interface TablaAprobacionDTO {
  categoria: {
    idCategoria: number;
    gestion: number;
    area: string;
    nivel: string;
    modalidad: ModalidadCategoria;
  };
  evaluador: {
    idEvaluador: number;
    nombreCompleto: string;
  };
  tipoFase: TipoFase;
  totales: {
    totalAsignados: number;
    totalConEvaluacion: number;
    totalAprobadas: number;
    totalPendientes: number;
  };
  filas: FilaAprobacionDTO[];
}

// Respuesta para aprobar/rechazar evaluación
export interface CambiarEstadoEvaluacionDTO {
  idEvaluacion: number;
  validado: boolean;
}

/**
 * =========================
 * Helpers internos
 * =========================
 */

function nombreCompleto(
  nombre: string,
  primer_apellido: string,
  segundo_apellido?: string | null
): string {
  const partes = [nombre, primer_apellido];
  if (segundo_apellido && segundo_apellido.trim() !== "") {
    partes.push(segundo_apellido.trim());
  }
  return partes.join(" ");
}

/**
 * Asignación activa como RESPONSABLE para una categoría.
 */
async function obtenerAsignacionResponsableCategoria(usuarioId: number) {
  const asignacion = await prisma.asignaciones.findFirst({
    where: {
      usuario_id: usuarioId,
      estado: true,
      usuario: {
        estado: true,
        rol: Rol.RESPONSABLE,
      },
      categoria: {
        estado: true,
      },
    },
    include: {
      categoria: {
        select: {
          id: true,
          gestion: true,
          modalidad: true,
          nota_min_clasificacion: true,
          area: {
            select: { nombre: true },
          },
          nivel: {
            select: { nombre: true },
          },
        },
      },
    },
  });

  return asignacion;
}

/**
 * IDs de participaciones asignadas a un evaluador según índice_inicio / índice_fin.
 */
async function obtenerParticipacionesIdsAsignadas(
  categoriaId: number,
  indice_inicio: number | null,
  indice_fin: number | null
): Promise<number[]> {
  const participaciones = await prisma.participacion.findMany({
    where: { categoria_id: categoriaId },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (participaciones.length === 0) return [];

  let inicio = indice_inicio ?? 1;
  let fin = indice_fin ?? participaciones.length;

  if (inicio < 1) inicio = 1;
  if (fin > participaciones.length) fin = participaciones.length;
  if (fin < inicio) return [];

  const slice = participaciones.slice(inicio - 1, fin);
  return slice.map((p) => p.id);
}

/**
 * Participaciones con detalle (olimpista/equipo) según rango asignado.
 */
async function obtenerParticipacionesAsignadasConDetalle(
  categoriaId: number,
  indice_inicio: number | null,
  indice_fin: number | null
) {
  const participaciones = await prisma.participacion.findMany({
    where: { categoria_id: categoriaId },
    select: {
      id: true,
      estado: true,
      olimpista: {
        select: {
          id: true,
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
          estado: true,
        },
      },
      equipo: {
        select: {
          id: true,
          nombre: true,
          miembros: {
            select: {
              rol_en_equipo: true,
              olimpista: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (participaciones.length === 0) return [];

  let inicio = indice_inicio ?? 1;
  let fin = indice_fin ?? participaciones.length;

  if (inicio < 1) inicio = 1;
  if (fin > participaciones.length) fin = participaciones.length;
  if (fin < inicio) return [];

  return participaciones.slice(inicio - 1, fin);
}

/**
 * Fase por gestión + tipo (CLASIFICATORIA / FINAL).
 */
async function obtenerFasePorTipo(gestion: number, tipo: TipoFase) {
  const fase = await prisma.fases.findFirst({
    where: {
      gestion,
      tipo,
    },
    select: {
      id: true,
      gestion: true,
      tipo: true,
    },
  });

  if (!fase) {
    throw new Error(
      `No se encontró la fase ${tipo} para la gestión ${gestion}.`
    );
  }

  return fase;
}

/**
 * =========================
 * 1) Resumen de categoría + evaluadores
 * =========================
 *
 * GET /api/aprobacion-calificaciones/resumen
 *
 * JSON de retorno:
 * {
 *   ok: true,
 *   data: {
 *     asignado: true,
 *     categoria: { ... },
 *     evaluadores: [
 *       {
 *         idEvaluador,
 *         nombreCompleto,
 *         fases: [
 *           {
 *             tipoFase: "CLASIFICATORIA",
 *             totalAsignados,
 *             totalConEvaluacion,
 *             totalAprobadas,
 *             totalPendientes
 *           },
 *           {
 *             tipoFase: "FINAL",
 *             totalAsignados,
 *             totalConEvaluacion,
 *             totalAprobadas,
 *             totalPendientes
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */

export async function getResumenAprobacionCategoriaSrv(
  responsableId: number
): Promise<ApiResponse<ResumenCategoriaAprobacionDTO>> {
  const asignacionResponsable =
    await obtenerAsignacionResponsableCategoria(responsableId);

  if (!asignacionResponsable || !asignacionResponsable.categoria) {
    return {
      ok: true,
      data: {
        asignado: false,
        message:
          "El usuario responsable aún no se encuentra asignado a una categoría.",
      },
    };
  }

  const categoria = asignacionResponsable.categoria;

  const categoriaDTO: ResumenCategoriaAprobacionDTO["categoria"] = {
    idCategoria: categoria.id,
    gestion: categoria.gestion,
    area: categoria.area.nombre,
    nivel: categoria.nivel.nombre,
    modalidad: categoria.modalidad,
  };

  // Fases de la gestión de la categoría
  const faseClasif = await obtenerFasePorTipo(
    categoria.gestion,
    TipoFase.CLASIFICATORIA
  );
  const faseFinal = await obtenerFasePorTipo(
    categoria.gestion,
    TipoFase.FINAL
  );

  // Asignaciones de evaluadores para esta categoría
  const asignacionesEvaluadores = await prisma.asignaciones.findMany({
    where: {
      categoria_id: categoria.id,
      estado: true,
      usuario: {
        estado: true,
        rol: Rol.EVALUADOR,
      },
    },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
    },
  });

  const evaluadoresDTO: ResumenCategoriaAprobacionDTO["evaluadores"] = [];

  for (const asign of asignacionesEvaluadores) {
    const evUser = asign.usuario;
    const nombreEval = nombreCompleto(
      evUser.nombre,
      evUser.primer_apellido,
      evUser.segundo_apellido
    );

    // IDs de participaciones asignadas a este evaluador
    const idsAsignados = await obtenerParticipacionesIdsAsignadas(
      categoria.id,
      asign.indice_inicio,
      asign.indice_fin
    );

    // Si no tiene participantes asignados, igual devolvemos el evaluador con contadores en 0
    if (idsAsignados.length === 0) {
      evaluadoresDTO.push({
        idEvaluador: evUser.id,
        nombreCompleto: nombreEval,
        fases: [
          {
            tipoFase: TipoFase.CLASIFICATORIA,
            totalAsignados: 0,
            totalConEvaluacion: 0,
            totalAprobadas: 0,
            totalPendientes: 0,
          },
          {
            tipoFase: TipoFase.FINAL,
            totalAsignados: 0,
            totalConEvaluacion: 0,
            totalAprobadas: 0,
            totalPendientes: 0,
          },
        ],
      });
      continue;
    }

    // Participaciones (para saber estado descalificado)
    const participaciones = await prisma.participacion.findMany({
      where: {
        id: { in: idsAsignados },
      },
      select: {
        id: true,
        estado: true,
      },
    });

    // Evaluaciones de la fase CLASIFICATORIA (para conteo + criterio de clasificación)
    const evaluacionesClasif = await prisma.evaluaciones.findMany({
      where: {
        fase_id: faseClasif.id,
        evaluador_id: evUser.id,
        participacion_id: { in: idsAsignados },
      },
      select: {
        id: true,
        participacion_id: true,
        nota: true,
        validado: true,
      },
    });

    const mapaEvClasif = new Map<
      number,
      (typeof evaluacionesClasif)[number]
    >();
    for (const ev of evaluacionesClasif) {
      mapaEvClasif.set(ev.participacion_id, ev);
    }

    // ===== 1) Contadores para CLASIFICATORIA =====
    const totalAsignadosClasif = idsAsignados.length;
    const totalConEvaluacionClasif = evaluacionesClasif.length;
    const totalAprobadasClasif = evaluacionesClasif.filter(
      (ev) => ev.validado
    ).length;
    const totalPendientesClasif =
      totalConEvaluacionClasif - totalAprobadasClasif;

    // ===== 2) Contadores para FINAL =====
    // Finalistas = NO descalificados + nota CLASIF >= nota_min_clasificacion
    const finalistasIds: number[] = [];

    for (const p of participaciones) {
      if (p.estado === EstadoParticipacion.DESCALIFICADO) {
        continue;
      }
      const evClasif = mapaEvClasif.get(p.id);
      if (!evClasif) continue;

      const notaClasif = Number(evClasif.nota);
      if (notaClasif >= categoria.nota_min_clasificacion) {
        finalistasIds.push(p.id);
      }
    }

    let totalAsignadosFinal = 0;
    let totalConEvaluacionFinal = 0;
    let totalAprobadasFinal = 0;
    let totalPendientesFinal = 0;

    if (finalistasIds.length > 0) {
      const evaluacionesFinal = await prisma.evaluaciones.findMany({
        where: {
          fase_id: faseFinal.id,
          evaluador_id: evUser.id,
          participacion_id: { in: finalistasIds },
        },
        select: {
          id: true,
          participacion_id: true,
          validado: true,
        },
      });

      totalAsignadosFinal = finalistasIds.length;
      totalConEvaluacionFinal = evaluacionesFinal.length;
      totalAprobadasFinal = evaluacionesFinal.filter(
        (ev) => ev.validado
      ).length;
      totalPendientesFinal =
        totalConEvaluacionFinal - totalAprobadasFinal;
    }

    evaluadoresDTO.push({
      idEvaluador: evUser.id,
      nombreCompleto: nombreEval,
      fases: [
        {
          tipoFase: TipoFase.CLASIFICATORIA,
          totalAsignados: totalAsignadosClasif,
          totalConEvaluacion: totalConEvaluacionClasif,
          totalAprobadas: totalAprobadasClasif,
          totalPendientes: totalPendientesClasif,
        },
        {
          tipoFase: TipoFase.FINAL,
          totalAsignados: totalAsignadosFinal,
          totalConEvaluacion: totalConEvaluacionFinal,
          totalAprobadas: totalAprobadasFinal,
          totalPendientes: totalPendientesFinal,
        },
      ],
    });
  }

  return {
    ok: true,
    data: {
      asignado: true,
      categoria: categoriaDTO,
      evaluadores: evaluadoresDTO,
    },
  };
}

/**
 * =========================
 * 2) Tabla de aprobación por evaluador + fase
 * =========================
 *
 * GET /api/aprobacion-calificaciones/tabla?evaluadorId=XX&tipoFase=CLASIFICATORIA|FINAL
 *
 * JSON de retorno:
 * {
 *   ok: true,
 *   data: {
 *     categoria: { ... },
 *     evaluador: { ... },
 *     tipoFase: "CLASIFICATORIA",
 *     totales: {
 *       totalAsignados,
 *       totalConEvaluacion,
 *       totalAprobadas,
 *       totalPendientes
 *     },
 *     filas: [
 *       {
 *         idEvaluacion,
 *         nombreParticipante,
 *         nota,
 *         validado
 *       }
 *     ]
 *   }
 * }
 */

export async function getTablaAprobacionPorEvaluadorSrv(params: {
  responsableId: number;
  evaluadorId: number;
  tipoFase: TipoFase;
}): Promise<ApiResponse<TablaAprobacionDTO>> {
  const { responsableId, evaluadorId, tipoFase } = params;

  const asignacionResponsable =
    await obtenerAsignacionResponsableCategoria(responsableId);

  if (!asignacionResponsable || !asignacionResponsable.categoria) {
    return {
      ok: false,
      message:
        "El responsable no tiene una categoría asignada para aprobar calificaciones.",
    };
  }

  const categoria = asignacionResponsable.categoria;

  // Asignación del evaluador dentro de ESTA categoría
  const asignacionEvaluador = await prisma.asignaciones.findFirst({
    where: {
      usuario_id: evaluadorId,
      categoria_id: categoria.id,
      estado: true,
      usuario: {
        estado: true,
        rol: Rol.EVALUADOR,
      },
    },
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
    },
  });

  if (!asignacionEvaluador) {
    return {
      ok: false,
      message:
        "El evaluador indicado no está asignado a la categoría del responsable.",
    };
  }

  const evaluador = asignacionEvaluador.usuario;
  const nombreEval = nombreCompleto(
    evaluador.nombre,
    evaluador.primer_apellido,
    evaluador.segundo_apellido
  );

  // Fases
  const faseActual = await obtenerFasePorTipo(
    categoria.gestion,
    tipoFase
  );
  const faseClasif = await obtenerFasePorTipo(
    categoria.gestion,
    TipoFase.CLASIFICATORIA
  );

  // Participaciones asignadas con detalle
  const participacionesAsignadas =
    await obtenerParticipacionesAsignadasConDetalle(
      categoria.id,
      asignacionEvaluador.indice_inicio,
      asignacionEvaluador.indice_fin
    );

  if (participacionesAsignadas.length === 0) {
    return {
      ok: true,
      data: {
        categoria: {
          idCategoria: categoria.id,
          gestion: categoria.gestion,
          area: categoria.area.nombre,
          nivel: categoria.nivel.nombre,
          modalidad: categoria.modalidad,
        },
        evaluador: {
          idEvaluador: evaluador.id,
          nombreCompleto: nombreEval,
        },
        tipoFase,
        totales: {
          totalAsignados: 0,
          totalConEvaluacion: 0,
          totalAprobadas: 0,
          totalPendientes: 0,
        },
        filas: [],
      },
    };
  }

  const idsAsignados = participacionesAsignadas.map((p) => p.id);

  // Evaluaciones de CLASIFICATORIA y de la fase actual de este evaluador
  const [evaluacionesClasif, evaluacionesActual] =
    await prisma.$transaction([
      prisma.evaluaciones.findMany({
        where: {
          fase_id: faseClasif.id,
          evaluador_id: evaluador.id,
          participacion_id: { in: idsAsignados },
        },
        select: {
          id: true,
          participacion_id: true,
          nota: true,
          validado: true,
        },
      }),
      prisma.evaluaciones.findMany({
        where: {
          fase_id: faseActual.id,
          evaluador_id: evaluador.id,
          participacion_id: { in: idsAsignados },
        },
        select: {
          id: true,
          participacion_id: true,
          nota: true,
          validado: true,
        },
      }),
    ]);

  const mapaEvClasif = new Map<
    number,
    (typeof evaluacionesClasif)[number]
  >();
  for (const ev of evaluacionesClasif) {
    mapaEvClasif.set(ev.participacion_id, ev);
  }

  const mapaEvActual = new Map<
    number,
    (typeof evaluacionesActual)[number]
  >();
  for (const ev of evaluacionesActual) {
    mapaEvActual.set(ev.participacion_id, ev);
  }

  const filas: FilaAprobacionDTO[] = [];

  for (const p of participacionesAsignadas) {
    // Filtro de FASE FINAL: solo clasificados por nota mínima y NO descalificados
    if (tipoFase === TipoFase.FINAL) {
      if (p.estado === EstadoParticipacion.DESCALIFICADO) {
        continue;
      }
      const evClasif = mapaEvClasif.get(p.id);
      if (!evClasif) {
        continue;
      }
      const notaClasif = Number(evClasif.nota);
      if (notaClasif < categoria.nota_min_clasificacion) {
        continue;
      }
    }

    const evActual = mapaEvActual.get(p.id);

    const idEvaluacion = evActual ? evActual.id : null;
    const nota = evActual ? Number(evActual.nota) : null;
    const validado =
      evActual !== undefined ? evActual.validado : null;

    // Nombre participante/equipo
    let nombreParticipante = "";
    if (categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (!p.olimpista) {
        continue;
      }
      nombreParticipante = nombreCompleto(
        p.olimpista.nombre,
        p.olimpista.primer_apellido,
        p.olimpista.segundo_apellido
      );
    } else {
      if (!p.equipo) {
        continue;
      }
      nombreParticipante = p.equipo.nombre;
    }

    filas.push({
      idEvaluacion,
      nombreParticipante,
      nota,
      validado,
    });
  }

  // Contadores
  let totalAsignados = 0;
  if (tipoFase === TipoFase.CLASIFICATORIA) {
    totalAsignados = participacionesAsignadas.length;
  } else {
    // FINAL → total asignados = finalistas (filas mostradas)
    totalAsignados = filas.length;
  }

  const totalConEvaluacion = filas.filter(
    (f) => f.idEvaluacion !== null
  ).length;
  const totalAprobadas = filas.filter(
    (f) => f.validado === true
  ).length;
  const totalPendientes = totalConEvaluacion - totalAprobadas;

  return {
    ok: true,
    data: {
      categoria: {
        idCategoria: categoria.id,
        gestion: categoria.gestion,
        area: categoria.area.nombre,
        nivel: categoria.nivel.nombre,
        modalidad: categoria.modalidad,
      },
      evaluador: {
        idEvaluador: evaluador.id,
        nombreCompleto: nombreEval,
      },
      tipoFase,
      totales: {
        totalAsignados,
        totalConEvaluacion,
        totalAprobadas,
        totalPendientes,
      },
      filas,
    },
  };
}

/**
 * =========================
 * 3) Aprobar/rechazar evaluación
 * =========================
 *
 * PATCH /api/aprobacion-calificaciones/evaluaciones/:idEvaluacion/aprobar
 * PATCH /api/aprobacion-calificaciones/evaluaciones/:idEvaluacion/rechazar
 *
 * JSON de retorno (ambos):
 * {
 *   ok: true,
 *   message: "...",
 *   data: {
 *     idEvaluacion,
 *     validado: true|false
 *   }
 * }
 */

export async function aprobarEvaluacionSrv(params: {
  responsableId: number;
  idEvaluacion: number;
}): Promise<ApiResponse<CambiarEstadoEvaluacionDTO>> {
  const { responsableId, idEvaluacion } = params;

  const evaluacion = await prisma.evaluaciones.findUnique({
    where: { id: idEvaluacion },
    include: {
      participacion: {
        select: {
          categoria_id: true,
        },
      },
    },
  });

  if (!evaluacion) {
    return {
      ok: false,
      message: "No se encontró la evaluación indicada.",
    };
  }

  // Verificar que el responsable está asignado a la categoría de esta evaluación
  const asignacionResponsable =
    await obtenerAsignacionResponsableCategoria(responsableId);

  if (
    !asignacionResponsable ||
    !asignacionResponsable.categoria ||
    asignacionResponsable.categoria.id !==
      evaluacion.participacion.categoria_id
  ) {
    return {
      ok: false,
      message:
        "No está autorizado para validar evaluaciones en esta categoría.",
    };
  }

  const valorAnterior = String(evaluacion.validado);

  const actualizada = await prisma.evaluaciones.update({
    where: { id: evaluacion.id },
    data: {
      validado: true,
      ultima_modificacion: new Date(),
    },
  });

  await prisma.logs.create({
    data: {
      entidad: "evaluaciones",
      entidad_id: actualizada.id,
      campo: "validado",
      valor_anterior: valorAnterior,
      valor_nuevo: "true",
      usuario_id: responsableId,
      motivo: `Aprobación de nota por responsable para evaluación ${actualizada.id}.`,
    },
  });

  return {
    ok: true,
    message: "Evaluación aprobada correctamente.",
    data: {
      idEvaluacion: actualizada.id,
      validado: actualizada.validado,
    },
  };
}

export async function rechazarEvaluacionSrv(params: {
  responsableId: number;
  idEvaluacion: number;
}): Promise<ApiResponse<CambiarEstadoEvaluacionDTO>> {
  const { responsableId, idEvaluacion } = params;

  const evaluacion = await prisma.evaluaciones.findUnique({
    where: { id: idEvaluacion },
    include: {
      participacion: {
        select: {
          categoria_id: true,
        },
      },
    },
  });

  if (!evaluacion) {
    return {
      ok: false,
      message: "No se encontró la evaluación indicada.",
    };
  }

  const asignacionResponsable =
    await obtenerAsignacionResponsableCategoria(responsableId);

  if (
    !asignacionResponsable ||
    !asignacionResponsable.categoria ||
    asignacionResponsable.categoria.id !==
      evaluacion.participacion.categoria_id
  ) {
    return {
      ok: false,
      message:
        "No está autorizado para validar evaluaciones en esta categoría.",
    };
  }

  const valorAnterior = String(evaluacion.validado);

  const actualizada = await prisma.evaluaciones.update({
    where: { id: evaluacion.id },
    data: {
      validado: false,
      ultima_modificacion: new Date(),
    },
  });

  await prisma.logs.create({
    data: {
      entidad: "evaluaciones",
      entidad_id: actualizada.id,
      campo: "validado",
      valor_anterior: valorAnterior,
      valor_nuevo: "false",
      usuario_id: responsableId,
      motivo: `Rechazo de nota por responsable para evaluación ${actualizada.id}.`,
    },
  });

  return {
    ok: true,
    message: "Evaluación rechazada correctamente.",
    data: {
      idEvaluacion: actualizada.id,
      validado: actualizada.validado,
    },
  };
}

export async function getParticipantesCategoriaResponsableSrv(
  responsableId: number
): Promise<ApiResponse<ParticipanteCategoriaResponsableDTO[]>> {
  const asignacionResponsable =
    await obtenerAsignacionResponsableCategoria(responsableId);

  if (!asignacionResponsable || !asignacionResponsable.categoria) {
    return {
      ok: true,
      data: [],
      message:
        "El usuario responsable aún no se encuentra asignado a una categoría.",
    };
  }

  const categoria = asignacionResponsable.categoria;

  const faseClasif = await obtenerFasePorTipo(
    categoria.gestion,
    TipoFase.CLASIFICATORIA
  );

  const participaciones = await prisma.participacion.findMany({
    where: {
      categoria_id: categoria.id,
    },
    select: {
      id: true,
      estado: true,
      olimpista: {
        select: {
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
      equipo: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (participaciones.length === 0) {
    return {
      ok: true,
      data: [],
    };
  }

  const idsParticipaciones = participaciones.map((p) => p.id);

  const evaluacionesClasif = await prisma.evaluaciones.findMany({
    where: {
      fase_id: faseClasif.id,
      participacion_id: { in: idsParticipaciones },
    },
    orderBy: { id: "asc" },
  });

  const mapaEvaluacionPorParticipacion = new Map<
    number,
    (typeof evaluacionesClasif)[number]
  >();

  for (const ev of evaluacionesClasif) {
    const actual = mapaEvaluacionPorParticipacion.get(ev.participacion_id);

    if (!actual) {
      mapaEvaluacionPorParticipacion.set(ev.participacion_id, ev);
      continue;
    }

    if (!actual.validado && ev.validado) {
      mapaEvaluacionPorParticipacion.set(ev.participacion_id, ev);
      continue;
    }

    if (actual.validado === ev.validado && ev.id > actual.id) {
      mapaEvaluacionPorParticipacion.set(ev.participacion_id, ev);
    }
  }

  const filas: ParticipanteCategoriaResponsableDTO[] = [];

  for (const p of participaciones) {
    const ev = mapaEvaluacionPorParticipacion.get(p.id) || null;

    let nota: number | null = null;
    let comentario: string | null = null;
    let estado: "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";

    if (ev) {
      nota = Number(ev.nota);
      comentario = ev.comentario ?? null;
    }

    if (p.estado === EstadoParticipacion.DESCALIFICADO) {
      estado = "DESCALIFICADO";
    } else if (ev && ev.validado && nota !== null) {
      if (nota >= categoria.nota_min_clasificacion) {
        estado = "CLASIFICADO";
      } else {
        estado = "NO_CLASIFICADO";
      }
    } else {
      estado = "NO_CLASIFICADO";
    }

    let nombreParticipante = "";
    if (categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (p.olimpista) {
        nombreParticipante = nombreCompleto(
          p.olimpista.nombre,
          p.olimpista.primer_apellido,
          p.olimpista.segundo_apellido
        );
      }
    } else {
      if (p.equipo) {
        nombreParticipante = p.equipo.nombre;
      }
    }

    filas.push({
      idParticipacion: p.id,
      nombreParticipante,
      nota,
      comentario,
      estado,
    });
  }

  return {
    ok: true,
    data: filas,
  };
}