// src/services/estadisticas.service.ts
import { prisma } from "../config/database";

export const EstadisticasService = {
  async getDashboardStats() {
    const [
      totalOlimpistas,
      totalResponsables,
      totalEvaluadores,
      totalInscritos,
      participacionesPorCategoria,
      categorias,
    ] = await Promise.all([
      prisma.olimpistas.count(),
      prisma.usuarios.count({
        where: { rol: "RESPONSABLE", estado: true },
      }),
      prisma.usuarios.count({
        where: { rol: "EVALUADOR", estado: true },
      }),
      prisma.participacion.count(),
      prisma.participacion.groupBy({
        by: ["categoria_id"],
        _count: {
          id: true,
        },
      }),
      prisma.categorias.findMany({
        include: {
          area: true,
          nivel: true,
        },
      }),
    ]);

    // Mapas para acumular conteos
    const areaCount: Record<number, { nombre: string; cantidad: number }> = {};
    const nivelCount: Record<number, { nombre: string; cantidad: number }> = {};

    // Crear mapa de categorías para acceso rápido
    const categoriasMap = new Map(categorias.map((c) => [c.id, c]));

    // Procesar los grupos de participaciones
    participacionesPorCategoria.forEach((p) => {
      const categoria = categoriasMap.get(p.categoria_id);
      const cantidad = p._count.id;

      if (categoria) {
        // Acumular por Área
        if (categoria.area) {
          const areaId = categoria.area.id;
          if (!areaCount[areaId]) {
            areaCount[areaId] = {
              nombre: categoria.area.nombre,
              cantidad: 0,
            };
          }
          areaCount[areaId].cantidad += cantidad;
        }

        // Acumular por Nivel
        if (categoria.nivel) {
          const nivelId = categoria.nivel.id;
          if (!nivelCount[nivelId]) {
            nivelCount[nivelId] = {
              nombre: categoria.nivel.nombre,
              cantidad: 0,
            };
          }
          nivelCount[nivelId].cantidad += cantidad;
        }
      }
    });

    const calcularPorcentaje = (cantidad: number) =>
      totalInscritos > 0
        ? Number(((cantidad / totalInscritos) * 100).toFixed(1))
        : 0;

    const porArea = Object.values(areaCount)
      .map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        porcentaje: calcularPorcentaje(item.cantidad),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const porNivel = Object.values(nivelCount)
      .map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        porcentaje: calcularPorcentaje(item.cantidad),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      olimpistas: totalOlimpistas,
      responsables: totalResponsables,
      evaluadores: totalEvaluadores,
      inscritosTotal: totalInscritos,
      porNivel,
      porArea,
    };
  },
};