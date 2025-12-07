// src/services/premiadosService.ts
import { PrismaClient, ModalidadCategoria } from '@prisma/client';

const prisma = new PrismaClient();

export interface PremiadoDTO {
  id: number;
  nombreCompleto: string;
  unidadEducativa: string;
  nota: number;
  modalidad: 'INDIVIDUAL' | 'GRUPAL';
  posicion: number;
  medalla: 'ORO' | 'PLATA' | 'BRONCE' | 'MENCIÓN' | null;
}

export interface PremiadosResponse {
  data: PremiadoDTO[];
  oros_final: number;
  platas_final: number;
  bronces_final: number;
  menciones_final: number;
}

export const obtenerPremiados = async (
  areaNombre: string,
  nivelNombre: string,
  gestion: number = new Date().getFullYear()
): Promise<PremiadosResponse> => {
  try {
    // 1. Validar que la fase FINAL tenga resultados publicados
    const faseFinal = await prisma.fases.findFirst({
      where: {
        gestion,
        tipo: 'FINAL',
        resultados_publicados: true,
      },
    });

    if (!faseFinal) {
      return {
        data: [],
        oros_final: 0,
        platas_final: 0,
        bronces_final: 0,
        menciones_final: 0,
      };
    }

    // 2. Obtener categoría activa con medallero completo
    const categoria = await prisma.categorias.findFirst({
      where: {
        gestion,
        area: { nombre: areaNombre, estado: true },
        nivel: { nombre: nivelNombre, estado: true },
        estado: true,
      },
      select: {
        id: true,
        oros_final: true,
        platas_final: true,
        bronces_final: true,
        menciones_final: true,
      },
    });

    if (!categoria) {
      return {
        data: [],
        oros_final: 0,
        platas_final: 0,
        bronces_final: 0,
        menciones_final: 0,
      };
    }

    // 3. Obtener participantes válidos con nota en fase FINAL
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
          where: { fase_id: faseFinal.id },
          select: { nota: true },
          orderBy: { nota: 'desc' },
          take: 1,
        },
      },
    });

    // Filtrar y ordenar por nota descendente
    const conNota = participaciones
      .filter(p => p.evaluaciones.length > 0 && p.evaluaciones[0].nota !== null)
      .sort((a, b) => Number(b.evaluaciones[0].nota) - Number(a.evaluaciones[0].nota));

    // Asignar medallas y menciones
    const resultados = conNota.map((p, index) => {
      const esIndividual = p.categoria.modalidad === ModalidadCategoria.INDIVIDUAL;
      const nota = Number(p.evaluaciones[0].nota);
      const posicion = index + 1;

      let medalla: 'ORO' | 'PLATA' | 'BRONCE' | 'MENCIÓN' | null = null;

      if (posicion <= categoria.oros_final) medalla = 'ORO';
      else if (posicion <= categoria.oros_final + categoria.platas_final) medalla = 'PLATA';
      else if (posicion <= categoria.oros_final + categoria.platas_final + categoria.bronces_final) medalla = 'BRONCE';
      else if (posicion <= categoria.oros_final + categoria.platas_final + categoria.bronces_final + categoria.menciones_final) medalla = 'MENCIÓN';

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
        posicion,
        medalla,
      };
    });

    return {
      data: resultados,
      oros_final: categoria.oros_final,
      platas_final: categoria.platas_final,
      bronces_final: categoria.bronces_final,
      menciones_final: categoria.menciones_final,
    };
  } catch (error: any) {
    console.error('Error en obtenerPremiados:', error);
    throw new Error(error.message || 'Error al cargar premiados');
  } finally {
    await prisma.$disconnect();
  }
};