// src/services/dashboardEvaluador.service.ts
import { prisma } from "../config/database";

export const DashboardEvaluadorService = {
  async getStats(evaluadorId: number) {
    // 1. Obtener categorías asignadas al evaluador (activas)
    const categoriasAsignadas = await prisma.asignaciones.count({
      where: {
        usuario_id: evaluadorId,
        estado: true,
      },
    });

    // 2. Todas las evaluaciones del evaluador (históricas y actuales)
    const evaluaciones = await prisma.evaluaciones.findMany({
      where: {
        evaluador_id: evaluadorId,
      },
      include: {
        participacion: {
          select: {
            categoria: {
              select: {
                modalidad: true,
                nota_min_clasificacion: true,
              },
            },
            equipo_id: true, // para saber si es grupal
          },
        },
      },
    });

    const totalEvaluadas = evaluaciones.length;

    let aprobados = 0;
    let individuales = 0;
    let grupales = 0;
    let validadas = 0;

    evaluaciones.forEach((ev) => {
      const notaMin = ev.participacion.categoria.nota_min_clasificacion;
      const esAprobado = Number(ev.nota) >= notaMin;

      if (esAprobado) aprobados++;
      if (ev.participacion.equipo_id === null) individuales++;
      else grupales++;

      if (ev.validado) validadas++;
    });

    const reprobados = totalEvaluadas - aprobados;
    const porcentajeAprobacion =
      totalEvaluadas > 0
        ? Number(((aprobados / totalEvaluadas) * 100).toFixed(1))
        : 0;

    const totalParticipantes = individuales + grupales;
    const porcentajeIndividual =
      totalParticipantes > 0
        ? Number(((individuales / totalParticipantes) * 100).toFixed(1))
        : 0;
    const porcentajeGrupal = 100 - porcentajeIndividual;

    return {
      categoriasAsignadas,
      evaluadasTotal: totalEvaluadas,
      aprobados,
      reprobados,
      porcentajeAprobacion,
      individuales,
      grupales,
      porcentajeIndividual,
      porcentajeGrupal,
      validadasPorResponsable: validadas,
    };
  },
};