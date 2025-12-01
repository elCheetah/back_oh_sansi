// src/services/estadisticas.service.ts
import { prisma } from "../config/database";

interface RawStatsRow {
  total_olimpistas: bigint;
  total_responsables: bigint;
  total_evaluadores: bigint;
  total_inscritos: bigint;
  area_id: number | null;
  nivel_id: number | null;
}

export const EstadisticasService = {
  async getDashboardStats() {
    const [rawStats, areas, niveles] = await Promise.all([
      // Forzamos el tipo con as
      prisma.$queryRaw<RawStatsRow[]>`
        SELECT 
          COUNT(DISTINCT o.id) AS total_olimpistas,
          COUNT(DISTINCT CASE WHEN u.rol = 'RESPONSABLE' AND u.estado = true THEN u.id END) AS total_responsables,
          COUNT(DISTINCT CASE WHEN u.rol = 'EVALUADOR' AND u.estado = true THEN u.id END) AS total_evaluadores,
          COUNT(p.id) AS total_inscritos,
          p.area_id,
          p.nivel_id
        FROM "participacion" p
        LEFT JOIN "olimpistas" o ON p.olimpista_id = o.id
        LEFT JOIN "miembros_equipo" me ON p.equipo_id = me.equipo_id
        LEFT JOIN "olimpistas" o2 ON me.olimpista_id = o2.id
        LEFT JOIN "usuarios" u ON u.rol IN ('RESPONSABLE', 'EVALUADOR') AND u.estado = true
        GROUP BY p.area_id, p.nivel_id
      `,

      prisma.areas.findMany({
        where: { estado: true },
        select: { id: true, nombre: true },
      }),

      prisma.niveles.findMany({
        select: { id: true, nombre: true },
      }),
    ]);

    // Convertir bigint a number
    const stats = rawStats.map(row => ({
      total_olimpistas: Number(row.total_olimpistas),
      total_responsables: Number(row.total_responsables),
      total_evaluadores: Number(row.total_evaluadores),
      total_inscritos: Number(row.total_inscritos),
      area_id: row.area_id,
      nivel_id: row.nivel_id,
    }));

    const areaMap = Object.fromEntries(areas.map(a => [a.id, a.nombre]));
    const nivelMap = Object.fromEntries(niveles.map(n => [n.id, n.nombre]));

    // Acumular por área y nivel
    const areaCount: Record<number, number> = {};
    const nivelCount: Record<number, number> = {};

    let totalInscritos = 0;
    let totalOlimpistas = 0;
    let totalResponsables = 0;
    let totalEvaluadores = 0;

    stats.forEach(row => {
      totalInscritos += row.total_inscritos;
      totalOlimpistas = Math.max(totalOlimpistas, row.total_olimpistas);
      totalResponsables = Math.max(totalResponsables, row.total_responsables);
      totalEvaluadores = Math.max(totalEvaluadores, row.total_evaluadores);

      if (row.area_id) {
        areaCount[row.area_id] = (areaCount[row.area_id] || 0) + row.total_inscritos;
      }
      if (row.nivel_id) {
        nivelCount[row.nivel_id] = (nivelCount[row.nivel_id] || 0) + row.total_inscritos;
      }
    });

    const calcularPorcentaje = (cantidad: number) =>
      totalInscritos > 0 ? Number((cantidad / totalInscritos * 100).toFixed(1)) : 0;

    const porArea = Object.entries(areaCount)
      .map(([id, cantidad]) => ({
        nombre: areaMap[Number(id)] || "Desconocido",
        cantidad,
        porcentaje: calcularPorcentaje(cantidad),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const porNivel = Object.entries(nivelCount).map(([id, cantidad]) => ({
      nombre: nivelMap[Number(id)] || "Desconocido",
      cantidad,
      porcentaje: calcularPorcentaje(cantidad),
    }));

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