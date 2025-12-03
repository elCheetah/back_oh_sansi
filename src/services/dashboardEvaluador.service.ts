// src/services/dashboardEvaluador.service.ts
import prisma from "../config/database";

export const DashboardEvaluadorService = {
  async getStats(evaluadorId: number) {
    // 1. Obtener categorías asignadas al evaluador (activas)
    const categoriasAsignadas = await prisma.asignaciones.findMany({
      where: {
        usuario_id: evaluadorId,
        estado: true,
      },
      select: {
        categoria: {
          select: {
            id: true,
            modalidad: true,
            nota_min_clasificacion: true,
          },
        },
      },
    });

    const categoriaIds = categoriasAsignadas.map((a) => a.categoria.id);

    if (categoriaIds.length === 0) {
      return {
        categoriasAsignadas: 0,
        evaluadasTotal: 0,
        aprobados: 0,
        reprobados: 0,
        porcentajeAprobacion: 0,
        individuales: 0,
        grupales: 0,
        porcentajeIndividual: 0,
        porcentajeGrupal: 0,
        validadasPorResponsable: 0,
      };
    }

    // 2. Todas las evaluaciones del evaluador en sus categorías
    const evaluaciones = await prisma.evaluaciones.findMany({
      where: {
        evaluador_id: evaluadorId,
        participacion: {
          categoria_id: { in: categoriaIds },
        },
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
      totalEvaluadas > 0 ? Number(((aprobados / totalEvaluadas) * 100).toFixed(1)) : 0;

    const totalParticipantes = individuales + grupales;
    const porcentajeIndividual =
      totalParticipantes > 0 ? Number(((individuales / totalParticipantes) * 100).toFixed(1)) : 0;
    const porcentajeGrupal = 100 - porcentajeIndividual;

    return {
      categoriasAsignadas: categoriaIds.length,
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