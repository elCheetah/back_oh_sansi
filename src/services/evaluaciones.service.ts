import prisma from "../config/database";
import {
  ModalidadCategoria,
  TipoFase,
  Rol,
  EstadoParticipacion,
  EstadoFase,
} from "@prisma/client";

export type EstadoNota = "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";
export type TipoMedalla = "ORO" | "PLATA" | "BRONCE" | "MENCION";
/**
 * ===== DTOs para el FRONT =====
 */


// Card del tablero principal
export interface CategoriaAsignadaCardDTO {
  idCategoria: number;
  fase: TipoFase; // "CLASIFICATORIA" | "FINAL"
  area: string;
  nivel: string;
  modalidad: ModalidadCategoria;
  cantidadAsignados: number;
  responsableDeArea: string | null;
  aprobadoPorResponsable: boolean;
  fechaInicioFase: Date | null;
  fechaFinFase: Date | null;
  estadoFase: EstadoFase; 
}


// Fila de la tabla de participantes/asignados
export interface ParticipanteAsignadoDTO {
  idFase: number;
  idParticipacion: number;
  nombreCompleto: string;
  nota: number | null;
  estadoNota: EstadoNota;
  validadoPorResponsable: boolean | null;
  medalla: TipoMedalla | null;
}


/**
 * ===== Helpers internos =====
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

async function obtenerFasePorTipo(
  gestion: number,
  tipo: TipoFase
) {
  const fase = await prisma.fases.findFirst({
    where: {
      gestion,
      tipo,
    },
  });

  if (!fase) {
    throw new Error(
      `No se encontró la fase ${tipo} para la gestión ${gestion}.`
    );
  }

  return fase;
}

async function obtenerAsignacionActiva(
  usuarioId: number,
  categoriaId: number
) {
  const asignacion = await prisma.asignaciones.findFirst({
    where: {
      usuario_id: usuarioId,
      categoria_id: categoriaId,
      estado: true,
    },
    select: {
      id: true,
      usuario_id: true,
      categoria_id: true,
      indice_inicio: true,
      indice_fin: true,
    },
  });

  if (!asignacion) {
    throw new Error(
      "No tiene una asignación activa para la categoría indicada."
    );
  }

  return asignacion;
}

/**
 * Devuelve los IDs de participaciones asignadas a un evaluador
 * según indice_inicio / indice_fin, ordenando por id asc.
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
 * Versión con detalle (para la tabla de participantes)
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
 * Responsable de área de una categoría (único asignado con rol RESPONSABLE)
 */
async function obtenerResponsableDeCategoria(
  categoriaId: number
): Promise<string | null> {
  const asignacionResponsable = await prisma.asignaciones.findFirst({
    where: {
      categoria_id: categoriaId,
      estado: true,
      usuario: {
        estado: true,
        rol: Rol.RESPONSABLE,
      },
    },
    include: {
      usuario: {
        select: {
          nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
        },
      },
    },
  });

  if (!asignacionResponsable || !asignacionResponsable.usuario) {
    return null;
  }

  const u = asignacionResponsable.usuario;
  return nombreCompleto(u.nombre, u.primer_apellido, u.segundo_apellido);
}

/**
 * ===== 1) TABLERO: categorías asignadas para el evaluador logueado =====
 */
export async function getCategoriasAsignadasParaEvaluacion(
  usuarioId: number
): Promise<CategoriaAsignadaCardDTO[]> {
  const asignaciones = await prisma.asignaciones.findMany({
    where: {
      usuario_id: usuarioId,
      estado: true,
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

  if (asignaciones.length === 0) {
    return [];
  }

  const gestiones = Array.from(
    new Set(asignaciones.map((a) => a.categoria.gestion))
  );

  const fases = await prisma.fases.findMany({
    where: {
      gestion: { in: gestiones },
      tipo: { in: [TipoFase.CLASIFICATORIA, TipoFase.FINAL] },
    },
    select: {
      id: true,
      gestion: true,
      tipo: true,
      inicio: true,
      fin: true,
      estado: true,
    },
  });

  const mapaFases = new Map<
    string,
    { id: number; gestion: number; tipo: TipoFase; inicio: Date | null; fin: Date | null; estado: EstadoFase; }
  >();

  for (const f of fases) {
    mapaFases.set(`${f.gestion}-${f.tipo}`, f);
  }

  const resultado: CategoriaAsignadaCardDTO[] = [];

  for (const asign of asignaciones) {
    const categoria = asign.categoria;
    const keyClasif = `${categoria.gestion}-${TipoFase.CLASIFICATORIA}`;
    const keyFinal = `${categoria.gestion}-${TipoFase.FINAL}`;

    const fasesCategoria: TipoFase[] = [];

    if (mapaFases.has(keyClasif)) {
      fasesCategoria.push(TipoFase.CLASIFICATORIA);
    }
    if (mapaFases.has(keyFinal)) {
      fasesCategoria.push(TipoFase.FINAL);
    }

    const idsAsignados = await obtenerParticipacionesIdsAsignadas(
      categoria.id,
      asign.indice_inicio,
      asign.indice_fin
    );

    const responsableDeArea = await obtenerResponsableDeCategoria(
      categoria.id
    );

    for (const tipoFase of fasesCategoria) {
      const fase = mapaFases.get(`${categoria.gestion}-${tipoFase}`)!;

      let cantidadAsignados = 0;
      let aprobadoPorResponsable = false;

      if (tipoFase === TipoFase.CLASIFICATORIA) {
        cantidadAsignados = idsAsignados.length;

        if (idsAsignados.length > 0) {
          const evaluacionesRaw = await prisma.evaluaciones.findMany({
            where: {
              fase_id: fase.id,
              participacion_id: { in: idsAsignados },
            },
            orderBy: { id: "asc" },
          });

          const mapaEv = new Map<
            number,
            (typeof evaluacionesRaw)[number]
          >();

          for (const ev of evaluacionesRaw) {
            const actual = mapaEv.get(ev.participacion_id);
            if (!actual || ev.id > actual.id) {
              mapaEv.set(ev.participacion_id, ev);
            }
          }

          if (mapaEv.size === idsAsignados.length) {
            aprobadoPorResponsable = Array.from(mapaEv.values()).every(
              (ev) => ev.validado
            );
          }
        }
      } else {
        const faseClasif = mapaFases.get(keyClasif);

        if (!faseClasif || idsAsignados.length === 0) {
          cantidadAsignados = 0;
          aprobadoPorResponsable = false;
        } else {
          const participacionesAsignadas = await prisma.participacion.findMany({
            where: {
              id: { in: idsAsignados },
            },
            select: {
              id: true,
              estado: true,
            },
          });

          const evaluacionesClasifRaw = await prisma.evaluaciones.findMany({
            where: {
              fase_id: faseClasif.id,
              participacion_id: {
                in: participacionesAsignadas.map((p) => p.id),
              },
            },
            orderBy: { id: "asc" },
          });

          const mapaEvClasif = new Map<
            number,
            (typeof evaluacionesClasifRaw)[number]
          >();

          for (const ev of evaluacionesClasifRaw) {
            const actual = mapaEvClasif.get(ev.participacion_id);
            if (!actual || ev.id > actual.id) {
              mapaEvClasif.set(ev.participacion_id, ev);
            }
          }

          const idsFinalistas: number[] = [];

          for (const p of participacionesAsignadas) {
            const evClasif = mapaEvClasif.get(p.id);
            const estaDescalificado =
              p.estado === EstadoParticipacion.DESCALIFICADO;
            const notaClasif = evClasif ? Number(evClasif.nota) : null;

            if (estaDescalificado) continue;
            if (!evClasif) continue;
            if (!evClasif.validado) continue;
            if (notaClasif === null) continue;
            if (notaClasif < categoria.nota_min_clasificacion) continue;

            idsFinalistas.push(p.id);
          }

          cantidadAsignados = idsFinalistas.length;

          if (idsFinalistas.length > 0) {
            const evaluacionesFinalRaw = await prisma.evaluaciones.findMany({
              where: {
                fase_id: fase.id,
                participacion_id: { in: idsFinalistas },
              },
              orderBy: { id: "asc" },
            });

            const mapaEvFinal = new Map<
              number,
              (typeof evaluacionesFinalRaw)[number]
            >();

            for (const ev of evaluacionesFinalRaw) {
              const actual = mapaEvFinal.get(ev.participacion_id);
              if (!actual || ev.id > actual.id) {
                mapaEvFinal.set(ev.participacion_id, ev);
              }
            }

            if (mapaEvFinal.size === idsFinalistas.length) {
              aprobadoPorResponsable = Array.from(
                mapaEvFinal.values()
              ).every((ev) => ev.validado);
            }
          }
        }
      }

      resultado.push({
        idCategoria: categoria.id,
        fase: tipoFase,
        area: categoria.area.nombre,
        nivel: categoria.nivel.nombre,
        modalidad: categoria.modalidad,
        cantidadAsignados,
        responsableDeArea,
        aprobadoPorResponsable,
        fechaInicioFase: fase.inicio,
        fechaFinFase: fase.fin,
        estadoFase: fase.estado,
      });
    }
  }

  return resultado;
}


/**
 * ===== 2) LISTA de participantes asignados para una categoría/fase =====
 */



// servicio
export async function getParticipantesAsignadosEnCategoria(params: {
  usuarioId: number;
  categoriaId: number;
  tipoFase: TipoFase;
}): Promise<ParticipanteAsignadoDTO[]> {
  const { usuarioId, categoriaId, tipoFase } = params;

  const asignacion = await obtenerAsignacionActiva(usuarioId, categoriaId);

  const categoria = await prisma.categorias.findUnique({
    where: { id: categoriaId },
    select: {
      id: true,
      gestion: true,
      modalidad: true,
      nota_min_clasificacion: true,
      oros_final: true,
      platas_final: true,
      bronces_final: true,
      menciones_final: true,
    },
  });

  if (!categoria) {
    throw new Error("No se encontró la categoría indicada.");
  }

  const faseActual = await obtenerFasePorTipo(categoria.gestion, tipoFase);
  const faseClasificatoria = await obtenerFasePorTipo(
    categoria.gestion,
    TipoFase.CLASIFICATORIA
  );

  const participaciones = await prisma.participacion.findMany({
    where: {
      categoria_id: categoria.id,
      ...(categoria.modalidad === ModalidadCategoria.INDIVIDUAL
        ? { olimpista_id: { not: null } }
        : { equipo_id: { not: null } }),
    },
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
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (participaciones.length === 0) {
    return [];
  }

  let inicio = asignacion.indice_inicio ?? 1;
  let fin = asignacion.indice_fin ?? participaciones.length;

  if (inicio < 1) inicio = 1;
  if (fin > participaciones.length) fin = participaciones.length;
  if (fin < inicio) return [];

  const participacionesAsignadas = participaciones.slice(inicio - 1, fin);

  if (participacionesAsignadas.length === 0) {
    return [];
  }

  const idsTodas = participaciones.map((p) => p.id);

  const [evaluacionesClasifRawTodas, evaluacionesActualRawTodas] =
    await prisma.$transaction([
      prisma.evaluaciones.findMany({
        where: {
          fase_id: faseClasificatoria.id,
          participacion_id: { in: idsTodas },
        },
        orderBy: { id: "asc" },
      }),
      prisma.evaluaciones.findMany({
        where: {
          fase_id: faseActual.id,
          participacion_id: { in: idsTodas },
        },
        orderBy: { id: "asc" },
      }),
    ]);

  const mapaEvClasifTodas = new Map<
    number,
    (typeof evaluacionesClasifRawTodas)[number]
  >();
  for (const ev of evaluacionesClasifRawTodas) {
    const actual = mapaEvClasifTodas.get(ev.participacion_id);
    if (!actual || ev.id > actual.id) {
      mapaEvClasifTodas.set(ev.participacion_id, ev);
    }
  }

  const mapaEvActualTodas = new Map<
    number,
    (typeof evaluacionesActualRawTodas)[number]
  >();
  for (const ev of evaluacionesActualRawTodas) {
    const actual = mapaEvActualTodas.get(ev.participacion_id);
    if (!actual || ev.id > actual.id) {
      mapaEvActualTodas.set(ev.participacion_id, ev);
    }
  }

  const mapaMedallas = new Map<number, TipoMedalla>();

  if (tipoFase === TipoFase.FINAL) {
    const finalistasCategoria: { idParticipacion: number; notaFinal: number }[] =
      [];

    for (const p of participaciones) {
      const evClasifAll = mapaEvClasifTodas.get(p.id);
      const evFinalAll = mapaEvActualTodas.get(p.id);

      const estaDescalificado =
        p.estado === EstadoParticipacion.DESCALIFICADO;
      const notaClasifAll = evClasifAll ? Number(evClasifAll.nota) : null;
      const notaFinalAll = evFinalAll ? Number(evFinalAll.nota) : null;

      if (estaDescalificado) continue;
      if (!evClasifAll) continue;
      if (!evClasifAll.validado) continue;
      if (notaClasifAll === null) continue;
      if (notaClasifAll < categoria.nota_min_clasificacion) continue;
      if (notaFinalAll === null) continue;

      finalistasCategoria.push({
        idParticipacion: p.id,
        notaFinal: notaFinalAll,
      });
    }

    finalistasCategoria.sort((a, b) => {
      if (b.notaFinal !== a.notaFinal) return b.notaFinal - a.notaFinal;
      return a.idParticipacion - b.idParticipacion;
    });

    const totalOros = categoria.oros_final;
    const totalPlatas = categoria.platas_final;
    const totalBronces = categoria.bronces_final;
    const totalMenciones = categoria.menciones_final;

    finalistasCategoria.forEach((item, index) => {
      let medalla: TipoMedalla | null = null;

      if (index < totalOros) medalla = "ORO";
      else if (index < totalOros + totalPlatas) medalla = "PLATA";
      else if (index < totalOros + totalPlatas + totalBronces)
        medalla = "BRONCE";
      else if (
        index <
        totalOros +
          totalPlatas +
          totalBronces +
          totalMenciones
      )
        medalla = "MENCION";

      if (medalla) {
        mapaMedallas.set(item.idParticipacion, medalla);
      }
    });
  }

  const resultado: ParticipanteAsignadoDTO[] = [];

  for (const p of participacionesAsignadas) {
    const evClasif = mapaEvClasifTodas.get(p.id);
    const evActual = mapaEvActualTodas.get(p.id);

    const estaDescalificado =
      p.estado === EstadoParticipacion.DESCALIFICADO;

    const notaClasif = evClasif ? Number(evClasif.nota) : null;

    if (tipoFase === TipoFase.FINAL) {
      if (estaDescalificado) continue;
      if (!evClasif) continue;
      if (!evClasif.validado) continue;
      if (notaClasif === null) continue;
      if (notaClasif < categoria.nota_min_clasificacion) continue;
    }

    const notaActual = evActual ? Number(evActual.nota) : null;
    const validadoPorResponsable = evActual ? evActual.validado : null;

    let estadoNota: EstadoNota;
    if (estaDescalificado) {
      estadoNota = "DESCALIFICADO";
    } else if (
      notaClasif !== null &&
      notaClasif >= categoria.nota_min_clasificacion
    ) {
      estadoNota = "CLASIFICADO";
    } else {
      estadoNota = "NO_CLASIFICADO";
    }

    const medalla =
      tipoFase === TipoFase.FINAL
        ? mapaMedallas.get(p.id) ?? null
        : null;

    if (categoria.modalidad === ModalidadCategoria.INDIVIDUAL) {
      if (!p.olimpista) continue;

      const o = p.olimpista;
      const nombre = nombreCompleto(
        o.nombre,
        o.primer_apellido,
        o.segundo_apellido
      );

      resultado.push({
        idFase: faseActual.id,
        idParticipacion: p.id,
        nombreCompleto: nombre,
        nota: notaActual,
        estadoNota,
        validadoPorResponsable,
        medalla,
      });
    } else {
      if (!p.equipo) continue;

      const equipo = p.equipo;

      resultado.push({
        idFase: faseActual.id,
        idParticipacion: p.id,
        nombreCompleto: equipo.nombre,
        nota: notaActual,
        estadoNota,
        validadoPorResponsable,
        medalla,
      });
    }
  }

  return resultado;
}

/**
 * ===== 3) GUARDAR / EDITAR evaluación por fila =====
 */

export async function guardarNotaEvaluacion(params: {
  usuarioId: number;
  idParticipacion: number;
  tipoFase: TipoFase;
  nota: number;
  comentario?: string;
}) {
  const { usuarioId, idParticipacion, tipoFase, nota, comentario } = params;

  const participacion = await prisma.participacion.findUnique({
    where: { id: idParticipacion },
    select: {
      id: true,
      categoria_id: true,
      categoria: {
        select: {
          id: true,
          gestion: true,
        },
      },
    },
  });

  if (!participacion || !participacion.categoria) {
    throw new Error("No se encontró la participación indicada.");
  }

  const categoriaId = participacion.categoria_id;

  const asignacion = await obtenerAsignacionActiva(usuarioId, categoriaId);

  const idsAsignados = await obtenerParticipacionesIdsAsignadas(
    categoriaId,
    asignacion.indice_inicio,
    asignacion.indice_fin
  );

  if (!idsAsignados.includes(idParticipacion)) {
    throw new Error(
      "No está autorizado para evaluar esta participación (fuera de su rango asignado)."
    );
  }

  const fase = await obtenerFasePorTipo(
    participacion.categoria.gestion,
    tipoFase
  );

  const evaluaciones = await prisma.evaluaciones.findMany({
    where: {
      participacion_id: idParticipacion,
      fase_id: fase.id,
    },
    orderBy: { id: "asc" },
  });

  let existente =
    evaluaciones.length > 0 ? evaluaciones[evaluaciones.length - 1] : null;

  if (evaluaciones.length > 1) {
    const idsAEliminar = evaluaciones
      .slice(0, evaluaciones.length - 1)
      .map((ev) => ev.id);

    await prisma.evaluaciones.deleteMany({
      where: { id: { in: idsAEliminar } },
    });
  }

  let valorAnterior: string | null = null;
  let evaluacionId: number;

  if (!existente) {
    const nueva = await prisma.evaluaciones.create({
      data: {
        participacion_id: idParticipacion,
        evaluador_id: usuarioId,
        fase_id: fase.id,
        nota,
        comentario: comentario || null,
        validado: false,
      },
    });
    evaluacionId = nueva.id;
    valorAnterior = null;
  } else {
    valorAnterior = String(existente.nota);
    const actualizada = await prisma.evaluaciones.update({
      where: { id: existente.id },
      data: {
        evaluador_id: usuarioId,
        nota,
        comentario: comentario ?? existente.comentario,
        validado: false,
        ultima_modificacion: new Date(),
      },
    });
    evaluacionId = actualizada.id;
  }

  await prisma.logs.create({
    data: {
      entidad: "evaluaciones",
      entidad_id: evaluacionId,
      campo: "nota",
      valor_anterior: valorAnterior,
      valor_nuevo: String(nota),
      usuario_id: usuarioId,
      motivo: `Actualización de nota en fase ${tipoFase} para participación ${idParticipacion} (categoría ${categoriaId}).`,
    },
  });

  return {
    idEvaluacion: evaluacionId,
    idParticipacion,
    nota,
  };
}

export async function descalificarParticipacion(params: {
  usuarioId: number;
  idParticipacion: number;
  motivo: string;
  tipoFase: TipoFase;
}) {
  const { usuarioId, idParticipacion, motivo, tipoFase } = params;

  if (!motivo || !motivo.trim()) {
    throw new Error(
      "Debe indicar un motivo para descalificar la participación."
    );
  }

  const participacion = await prisma.participacion.findUnique({
    where: { id: idParticipacion },
    select: {
      id: true,
      estado: true,
      categoria_id: true,
      categoria: {
        select: {
          id: true,
          gestion: true,
        },
      },
    },
  });

  if (!participacion || !participacion.categoria) {
    throw new Error("No se encontró la participación indicada.");
  }

  const categoriaId = participacion.categoria_id;

  const asignacion = await obtenerAsignacionActiva(usuarioId, categoriaId);

  const idsAsignados = await obtenerParticipacionesIdsAsignadas(
    categoriaId,
    asignacion.indice_inicio,
    asignacion.indice_fin
  );

  if (!idsAsignados.includes(idParticipacion)) {
    throw new Error(
      "No está autorizado para descalificar esta participación (fuera de su rango asignado)."
    );
  }

  const fase = await obtenerFasePorTipo(
    participacion.categoria.gestion,
    tipoFase
  );

  const valorAnterior = participacion.estado;

  const actualizada = await prisma.participacion.update({
    where: { id: idParticipacion },
    data: {
      estado: EstadoParticipacion.DESCALIFICADO,
    },
  });

  await prisma.logs.create({
    data: {
      entidad: "participacion",
      entidad_id: actualizada.id,
      campo: "estado",
      valor_anterior: valorAnterior,
      valor_nuevo: EstadoParticipacion.DESCALIFICADO,
      usuario_id: usuarioId,
      motivo: motivo,
    },
  });

  const evaluaciones = await prisma.evaluaciones.findMany({
    where: {
      participacion_id: idParticipacion,
      fase_id: fase.id,
    },
    orderBy: { id: "asc" },
  });

  let evaluacionExistente =
    evaluaciones.length > 0 ? evaluaciones[evaluaciones.length - 1] : null;

  if (evaluaciones.length > 1) {
    const idsAEliminar = evaluaciones
      .slice(0, evaluaciones.length - 1)
      .map((ev) => ev.id);

    await prisma.evaluaciones.deleteMany({
      where: { id: { in: idsAEliminar } },
    });
  }

  let evaluacionId: number;
  let valorAnteriorComentario: string | null = null;
  const gestionFase = participacion.categoria.gestion;

  if (!evaluacionExistente) {
    const nuevaEval = await prisma.evaluaciones.create({
      data: {
        participacion_id: idParticipacion,
        evaluador_id: usuarioId,
        fase_id: fase.id,
        nota: 0,
        comentario: motivo,
        validado: false,
      },
    });
    evaluacionId = nuevaEval.id;

    await prisma.logs.create({
      data: {
        entidad: "evaluaciones",
        entidad_id: nuevaEval.id,
        campo: "nota/comentario",
        valor_anterior: null,
        valor_nuevo: `nota=0, comentario=${motivo}`,
        usuario_id: usuarioId,
        motivo: `Descalificación (creación de evaluación) en fase ${tipoFase} gestión ${gestionFase} para participación ${idParticipacion}.`,
      },
    });
  } else {
    valorAnteriorComentario = evaluacionExistente.comentario ?? null;

    const evalActualizada = await prisma.evaluaciones.update({
      where: { id: evaluacionExistente.id },
      data: {
        evaluador_id: usuarioId,
        comentario: motivo,
        validado: false,
        ultima_modificacion: new Date(),
      },
    });

    evaluacionId = evalActualizada.id;

    await prisma.logs.create({
      data: {
        entidad: "evaluaciones",
        entidad_id: evalActualizada.id,
        campo: "comentario",
        valor_anterior: valorAnteriorComentario,
        valor_nuevo: motivo,
        usuario_id: usuarioId,
        motivo: `Descalificación (actualización de comentario) en fase ${tipoFase} gestión ${gestionFase} para participación ${idParticipacion}.`,
      },
    });
  }

  return {
    idParticipacion: actualizada.id,
    estado: actualizada.estado,
    idEvaluacion: evaluacionId,
  };
}
