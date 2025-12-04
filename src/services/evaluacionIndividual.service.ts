import { prisma } from "../config/database";

export const EvaluacionIndividualService = {
    async getAssignedOlympians(evaluadorId: number) {
        // 1. Obtener asignaciones activas del evaluador
        const asignaciones = await prisma.asignaciones.findMany({
            where: {
                usuario_id: evaluadorId,
                estado: true,
            },
            include: {
                categoria: true,
            },
        });

        if (asignaciones.length === 0) {
            return [];
        }

        const categoriaIds = asignaciones.map((a: { categoria_id: number }) => a.categoria_id);

        // 2. Obtener participaciones de esas categorías
        // Se asume que si es individual, olimpista_id no es null.
        // Si es grupal, equipo_id no es null.
        // Aquí traeremos todo y el front filtrará o el controller separará si se desea.
        // Pero el requerimiento pide endpoints para "FasesEvaluacionGrupal" y "FasesEvaluacionIndividual".
        // Podríamos filtrar aquí mismo.

        const participaciones = await prisma.participacion.findMany({
            where: {
                categoria_id: { in: categoriaIds },
            },
            include: {
                olimpista: true,
                equipo: true,
                categoria: {
                    include: {
                        area: true,
                        nivel: true,
                    },
                },
                evaluaciones: {
                    where: {
                        evaluador_id: evaluadorId,
                    },
                },
            },
        });

        // Mapeamos a un formato amigable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resultados = participaciones.map((p: any) => {
            const evaluacion = p.evaluaciones[0]; // Debería haber una o ninguna por evaluador/fase

            // Determinar si es individual o grupal
            const esIndividual = !!p.olimpista;

            return {
                id: p.id, // ID de la participación
                nombre: esIndividual
                    ? `${p.olimpista?.nombre} ${p.olimpista?.primer_apellido} ${p.olimpista?.segundo_apellido || ''}`.trim()
                    : p.equipo?.nombre,
                ci: p.olimpista?.numero_documento, // Solo si es individual
                codigo: p.id, // Usamos ID de participación como código temporal o el que corresponda
                areaCompetencia: p.categoria.area.nombre,
                nivel: p.categoria.nivel.nombre,
                modalidad: p.categoria.modalidad,
                nota: evaluacion ? Number(evaluacion.nota) : 0,
                observacion: evaluacion?.comentario || "",
                // Si hubiera lógica de descalificado en la BD, se mapearía aquí
                desclasificado: false,
                motivo: "",
                tipo: esIndividual ? 'INDIVIDUAL' : 'GRUPAL'
            };
        });

        return resultados;
    },
};
