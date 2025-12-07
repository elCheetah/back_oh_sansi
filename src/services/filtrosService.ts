// src/services/filtrosService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FiltroCategoriaDTO {
  area: string;
  niveles: string[];
}

export const obtenerFiltrosCategorias = async (
  gestion: number = new Date().getFullYear()
): Promise<FiltroCategoriaDTO[]> => {
  try {
    const categorias = await prisma.categorias.findMany({
      where: {
        gestion,
        estado: true,
        area: {
          estado: true,
        },
        nivel: {
          estado: true,
        },
      },
      select: {
        area: {
          select: {
            nombre: true,
          },
        },
        nivel: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: [
        { area: { nombre: 'asc' } },
        { nivel: { nombre: 'asc' } },
      ],
    });

    if (categorias.length === 0) {
      console.log(`No hay categorías activas para la gestión ${gestion}`);
      return [];
    }

    // Agrupar por área
    const mapa = new Map<string, Set<string>>();

    categorias.forEach(cat => {
      const area = cat.area.nombre;
      const nivel = cat.nivel.nombre;

      if (!mapa.has(area)) {
        mapa.set(area, new Set());
      }
      mapa.get(area)!.add(nivel);
    });

    return Array.from(mapa.entries())
      .map(([area, nivelesSet]) => ({
        area,
        niveles: Array.from(nivelesSet).sort(),
      }))
      .sort((a, b) => a.area.localeCompare(b.area));

  } catch (error) {
    console.error('Error al obtener filtros:', error);
    throw new Error('Error interno del servidor');
  } finally {
    await prisma.$disconnect();
  }
};