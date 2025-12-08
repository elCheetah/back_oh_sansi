// src/services/clasificadosService.ts
import { PrismaClient, EstadoParticipacion, ModalidadCategoria } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClasificadoDTO {
  id: number;
  nombreCompleto: string;
  unidadEducativa: string;
  nota: number | null;
  modalidad: 'INDIVIDUAL' | 'GRUPAL';
  estado: 'CLASIFICADO' | 'NO_CLASIFICADO' | 'DESCALIFICADO';
}

export const obtenerClasificados = async (
  areaNombre: string,
  nivelNombre: string,
  gestion: number = new Date().getFullYear()
): Promise<{ data: ClasificadoDTO[]; nota_min_clasificacion: number }> => {
  try {
    // 1. Validar fase clasificatoria publicada
    const faseClasificatoria = await prisma.fases.findFirst({
      where: {
        gestion,
        tipo: 'CLASIFICATORIA',
        resultados_publicados: true,
      },
    });

    if (!faseClasificatoria) {
      return { data: [], nota_min_clasificacion: 0 };
    }

    // 2. Obtener categoría activa con nota mínima
    const categoria = await prisma.categorias.findFirst({
      where: {
        gestion,
        area: { nombre: areaNombre, estado: true },
        nivel: { nombre: nivelNombre, estado: true },
        estado: true,
      },
      select: {
        id: true,
        nota_min_clasificacion: true,
      },
    });

    if (!categoria) {
      return { data: [], nota_min_clasificacion: 0 };
    }

    // 3. Obtener participaciones válidas
    const participaciones = await prisma.participacion.findMany({
      where: {
        categoria_id: categoria.id,
        OR: [
          { olimpista: { estado: true } },
          { equipo: { miembros: { every: { olimpista: { estado: true } } } } },
        ],
      },
      select: {
        id: true,
        estado: true,
        olimpista: {
          select: {
            nombre: true,
            primer_apellido: true,
            segundo_apellido: true,
            unidad_educativa: true,
          },
        },
        equipo: { select: { nombre: true } },
        categoria: { select: { modalidad: true } },
        evaluaciones: {
          where: { fase: { tipo: 'CLASIFICATORIA' } },
          select: { nota: true },
          orderBy: { nota: 'desc' },
          take: 1,
        },
      },
    });

    // 4. Procesar datos
    const data = participaciones.map(p => {
      const esIndividual = p.categoria.modalidad === ModalidadCategoria.INDIVIDUAL;
      const nota = p.evaluaciones[0]?.nota ? Number(p.evaluaciones[0].nota) : null;

      // LÓGICA DE ESTADO
      let estadoFinal: 'CLASIFICADO' | 'NO_CLASIFICADO' | 'DESCALIFICADO';

      if (p.estado === 'DESCALIFICADO') {
        estadoFinal = 'DESCALIFICADO';
      } else {
        estadoFinal = nota !== null && nota >= categoria.nota_min_clasificacion
          ? 'CLASIFICADO'
          : 'NO_CLASIFICADO';
      }

      return {
        id: p.id,
        nombreCompleto: esIndividual
          ? `${p.olimpista?.nombre} ${p.olimpista?.primer_apellido} ${p.olimpista?.segundo_apellido || ''}`.trim()
          : p.equipo?.nombre || 'Equipo sin nombre',
        unidadEducativa: esIndividual
          ? p.olimpista?.unidad_educativa || 'Sin unidad educativa'
          : 'Equipo grupal',
        nota,
        modalidad: p.categoria.modalidad,
        estado: estadoFinal,
      };
    });

    // 5. ORDENAMIENTO: nota descendente + descalificados al final
    const ordenados = data.sort((a, b) => {
      // Descalificados al final
      if (a.estado === 'DESCALIFICADO' && b.estado !== 'DESCALIFICADO') return 1;
      if (b.estado === 'DESCALIFICADO' && a.estado !== 'DESCALIFICADO') return -1;

      // Ordenar por nota (mayor a menor)
      const notaA = a.nota ?? 0;
      const notaB = b.nota ?? 0;
      return notaB - notaA;
    });

    return {
      data: ordenados,
      nota_min_clasificacion: categoria.nota_min_clasificacion,
    };
  } catch (error) {
    console.error('Error al obtener clasificados:', error);
    throw new Error('No se pudieron cargar los participantes');
  } finally {
    await prisma.$disconnect();
  }
};