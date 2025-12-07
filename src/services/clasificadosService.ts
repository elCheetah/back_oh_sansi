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
    // 1. Verificar si los resultados están publicados en la fase clasificatoria
    const faseClasificatoria = await prisma.fases.findFirst({
      where: {
        gestion,
        tipo: 'CLASIFICATORIA',
        resultados_publicados: true,
      },
    });

    if (!faseClasificatoria) {
      return { data: [], nota_min_clasificacion: 0 }; // No retornar nada si no están publicados
    }

    // 2. Obtener la categoría con nota_min_clasificacion y estado = true
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
      return { data: [], nota_min_clasificacion: 0 }; // Si la categoría no existe o está inactiva
    }

    // 3. Obtener participaciones con estados activos
    const participaciones = await prisma.participacion.findMany({
      where: {
        categoria_id: categoria.id,
        OR: [
          { olimpista: { estado: true } }, // Olimpista activo
          { equipo: { miembros: { every: { olimpista: { estado: true } } } } }, // Todos los miembros del equipo activos
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
      orderBy: { id: 'asc' },
    });

    const data = participaciones.map(p => {
      const esIndividual = p.categoria.modalidad === ModalidadCategoria.INDIVIDUAL;
      const nota = p.evaluaciones[0]?.nota ? Number(p.evaluaciones[0].nota) : null;

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
        estado: p.estado,
      };
    });

    return {
      data,
      nota_min_clasificacion: categoria.nota_min_clasificacion,
    };
  } catch (error) {
    console.error('Error al obtener clasificados:', error);
    throw new Error('No se pudieron cargar los participantes');
  } finally {
    await prisma.$disconnect();
  }
};