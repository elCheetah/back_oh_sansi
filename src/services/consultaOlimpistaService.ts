// src/services/consultaOlimpistaService.ts
import { PrismaClient, ModalidadCategoria } from '@prisma/client';

const prisma = new PrismaClient();

export interface ResultadoExamenDTO {
  area: string;
  nivel: string;
  modalidad: 'Individual' | 'Grupal';
  fase: string;
  estado: 'Clasificado' | 'No clasificado' | 'Descalificado' | null; // ahora puede ser null
  nota: number | null;
  notaEvaluador: string;
  medalla?: 'ORO' | 'PLATA' | 'BRONCE' | 'MENCIÓN' | null;
  nombreEquipo?: string;
}

export interface OlimpistaDTO {
  nombreCompleto: string;
  ci: string;
  unidadEducativa: string;
  resultados: ResultadoExamenDTO[];
}

export const obtenerOlimpistaPorCI = async (ci: string): Promise<OlimpistaDTO | null> => {
  try {
    const olimpista = await prisma.olimpistas.findFirst({
      where: {
        numero_documento: ci,
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        primer_apellido: true,
        segundo_apellido: true,
        unidad_educativa: true,
        participacion: {
          where: {
            categoria: {
              estado: true,
              area: { estado: true },
              nivel: { estado: true },
            },
          },
          select: {
            id: true,
            categoria_id: true,
            estado: true,
            categoria: {
              select: {
                area: { select: { nombre: true } },
                nivel: { select: { nombre: true } },
                modalidad: true,
                nota_min_clasificacion: true,
                oros_final: true,
                platas_final: true,
                bronces_final: true,
                menciones_final: true,
              },
            },
            equipo: { select: { nombre: true } },
            evaluaciones: {
              where: { fase: { resultados_publicados: true } },
              select: {
                nota: true,
                comentario: true,
                fase: { select: { nombre: true, tipo: true } },
              },
              orderBy: { fase: { tipo: 'desc' } },
            },
          },
        },
        miembros_equipo: {
          select: {
            equipo: {
              select: {
                nombre: true,
                participacion: {
                  where: {
                    categoria: {
                      estado: true,
                      area: { estado: true },
                      nivel: { estado: true },
                    },
                  },
                  select: {
                    id: true,
                    categoria_id: true,
                    estado: true,
                    categoria: {
                      select: {
                        area: { select: { nombre: true } },
                        nivel: { select: { nombre: true } },
                        modalidad: true,
                        nota_min_clasificacion: true,
                        oros_final: true,
                        platas_final: true,
                        bronces_final: true,
                        menciones_final: true,
                      },
                    },
                    evaluaciones: {
                      where: { fase: { resultados_publicados: true } },
                      select: {
                        nota: true,
                        comentario: true,
                        fase: { select: { nombre: true, tipo: true } },
                      },
                      orderBy: { fase: { tipo: 'desc' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!olimpista) return null;

    const resultados: ResultadoExamenDTO[] = [];

    // 1. Participaciones individuales
    for (const p of olimpista.participacion) {
      const esGrupal = p.categoria.modalidad === ModalidadCategoria.GRUPAL;
      const evaluacion = p.evaluaciones[0];
      const nota = evaluacion?.nota ? Number(evaluacion.nota) : null;

      // NUEVA LÓGICA: si es fase FINAL → estado = null
      let estadoFinal: 'Clasificado' | 'No clasificado' | 'Descalificado' | null = null;

      if (evaluacion?.fase?.tipo === 'FINAL') {
        estadoFinal = null; // En fase final no mostramos estado
      } else {
        // Solo en clasificatoria calculamos
        if (p.estado === 'DESCALIFICADO') {
          estadoFinal = 'Descalificado';
        } else {
          if (nota !== null && nota >= p.categoria.nota_min_clasificacion) {
        estadoFinal = 'Clasificado'; // Si clasifico
        } else {
        estadoFinal = 'No clasificado'; // Si no clasifico
        }
        }
      }

      let medalla: 'ORO' | 'PLATA' | 'BRONCE' | 'MENCIÓN' | null = null;

      if (evaluacion && evaluacion.fase?.tipo === 'FINAL') {
        const participantesFinal = await prisma.participacion.findMany({
          where: { categoria_id: p.categoria_id },
          include: {
            evaluaciones: {
              where: { fase: { tipo: 'FINAL', resultados_publicados: true } },
              orderBy: { nota: 'desc' },
            },
          },
        });

        const ordenados = participantesFinal
          .filter(part => part.evaluaciones.length > 0 && part.evaluaciones[0].nota !== null)
          .sort((a, b) => Number(b.evaluaciones[0].nota) - Number(a.evaluaciones[0].nota));

        const posicion = ordenados.findIndex(part => part.id === p.id) + 1;

        if (posicion <= p.categoria.oros_final) medalla = 'ORO';
        else if (posicion <= p.categoria.oros_final + p.categoria.platas_final) medalla = 'PLATA';
        else if (posicion <= p.categoria.oros_final + p.categoria.platas_final + p.categoria.bronces_final) medalla = 'BRONCE';
        else if (posicion <= p.categoria.oros_final + p.categoria.platas_final + p.categoria.bronces_final + p.categoria.menciones_final) medalla = 'MENCIÓN';
      }

      resultados.push({
        area: p.categoria.area.nombre,
        nivel: p.categoria.nivel.nombre,
        modalidad: esGrupal ? 'Grupal' : 'Individual',
        fase: evaluacion?.fase?.nombre || 'Sin fase',
        estado: estadoFinal,
        nota,
        notaEvaluador: evaluacion?.comentario || 'Sin comentario',
        medalla,
        nombreEquipo: esGrupal ? p.equipo?.nombre || 'Equipo sin nombre' : undefined,
      });
    }

    // 2. Participaciones grupales (misma lógica)
    for (const miembro of olimpista.miembros_equipo) {
      for (const p of miembro.equipo.participacion) {
        const evaluacion = p.evaluaciones[0];
        const nota = evaluacion?.nota ? Number(evaluacion.nota) : null;

        let estadoFinal: 'Clasificado' | 'No clasificado' | 'Descalificado' | null = null;

        if (evaluacion?.fase?.tipo === 'FINAL') {
          estadoFinal = null;
        } else {
          if (p.estado === 'DESCALIFICADO') {
            estadoFinal = 'Descalificado';
          } else {
            if (nota !== null && nota >= p.categoria.nota_min_clasificacion) {
            estadoFinal = 'Clasificado'; // Si clasifico
           } else {
            estadoFinal = 'No clasificado'; // Si no clasifico
            }
          }
        }

        let medalla: 'ORO' | 'PLATA' | 'BRONCE' | 'MENCIÓN' | null = null;

        if (evaluacion && evaluacion.fase?.tipo === 'FINAL') {
          const participantesFinal = await prisma.participacion.findMany({
            where: { categoria_id: p.categoria_id },
            include: {
              evaluaciones: {
                where: { fase: { tipo: 'FINAL', resultados_publicados: true } },
                orderBy: { nota: 'desc' },
              },
            },
          });

          const ordenados = participantesFinal
            .filter(part => part.evaluaciones.length > 0 && part.evaluaciones[0].nota !== null)
            .sort((a, b) => Number(b.evaluaciones[0].nota) - Number(a.evaluaciones[0].nota));

          const posicion = ordenados.findIndex(part => part.id === p.id) + 1;

          if (posicion <= p.categoria.oros_final) medalla = 'ORO';
          else if (posicion <= p.categoria.oros_final + p.categoria.platas_final) medalla = 'PLATA';
          else if (posicion <= p.categoria.oros_final + p.categoria.platas_final + p.categoria.bronces_final) medalla = 'BRONCE';
          else if (posicion <= p.categoria.oros_final + p.categoria.platas_final + p.categoria.bronces_final + p.categoria.menciones_final) medalla = 'MENCIÓN';
        }

        resultados.push({
          area: p.categoria.area.nombre,
          nivel: p.categoria.nivel.nombre,
          modalidad: 'Grupal',
          fase: evaluacion?.fase?.nombre || 'Sin fase',
          estado: estadoFinal,
          nota,
          notaEvaluador: evaluacion?.comentario || 'Sin comentario',
          medalla,
          nombreEquipo: miembro.equipo.nombre,
        });
      }
    }

    return {
      nombreCompleto: `${olimpista.nombre} ${olimpista.primer_apellido} ${olimpista.segundo_apellido || ''}`.trim(),
      ci,
      unidadEducativa: olimpista.unidad_educativa || 'Sin unidad educativa',
      resultados,
    };
  } catch (error) {
    console.error('Error al buscar olimpista:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};