import { Request, Response } from 'express';
// Asegúrate de que este path sea correcto para tu instancia de Prisma Client
import prisma from '../config/database'; 

/**
 * Endpoint para obtener la lista de participaciones de olimpistas listos para ser calificados.
 * Incluye datos del olimpista (nombre + apellido) y detalles de la competición (área, nivel).
 * Ruta: GET /api/evaluaciones/participaciones
 */
export const listarParticipacionesParaCalificar = async (req: Request, res: Response) => {
    try {
        // En un entorno real, el evaluadorId se obtendría del token (req.usuario.id)
        // Por ahora, lo tomaremos de la query o usaremos un valor por defecto para la prueba.
        const { areaId, nivelId, faseId, evaluadorId } = req.query;

        // --- LÓGICA DE ASIGNACIÓN: Filtrar por lo que el evaluador tiene permitido calificar ---
        const evaluadorIdNum = Number(evaluadorId);
        
        if (isNaN(evaluadorIdNum)) {
            // Este caso no debería ocurrir si hay autenticación, pero es una protección.
            return res.status(403).json({ error: 'Falta el ID del evaluador o es inválido.' });
        }

        // 1. Obtener las asignaciones del evaluador (áreas y niveles que puede calificar)
        const asignaciones = await prisma.asignaciones.findMany({
            where: {
                usuario_id: evaluadorIdNum,
                activo: true,
            },
            select: {
                area_id: true,
                nivel_id: true,
            }
        });

        if (asignaciones.length === 0) {
            return res.status(200).json({ 
                mensaje: 'El evaluador no tiene áreas ni niveles asignados para calificar.',
                total: 0,
                datos: []
            });
        }
        
        // Mapear las asignaciones a filtros de Participación (ej: {area_id: 1, nivel_id: 5})
        const filtrosAsignacion = asignaciones.map(a => ({
            area_id: a.area_id,
            nivel_id: a.nivel_id
        }));

        // --- FILTROS ADICIONALES ---
        const filtrosConsulta: any = {
            OR: filtrosAsignacion, // Solo participaciones que caen en las áreas/niveles asignados
            // Aquí puedes añadir más filtros si vienen de la UI (ej. si el evaluador selecciona un área/nivel)
        };
        
        if (areaId) filtrosConsulta.area_id = Number(areaId);
        if (nivelId) filtrosConsulta.nivel_id = Number(nivelId);

        // --- CONSULTA PRINCIPAL ---
        const participaciones = await prisma.participacion.findMany({
            where: filtrosConsulta,
            select: {
                id: true, 
                area_id: true, // Se usa para la lógica de validación
                nivel_id: true, // Se usa para la lógica de validación
                olimpista: {
                    select: {
                        id: true,
                        nombre: true, 
                        ap_paterno: true, // Usamos el ap_paterno para el nombre completo
                        ap_materno: true,
                        numero_documento: true,
                    },
                },
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
                // Traer evaluaciones existentes para la fase actual (si se proporciona)
                evaluaciones: {
                    where: {
                        fase_id: faseId ? Number(faseId) : undefined,
                    },
                    select: {
                        nota: true,
                        comentario: true,
                        validado: true,
                    }
                }
            },
            orderBy: {
                // Ordenar por el ID de participación
                id: 'asc'
            }
        });
        
        // Mapear para devolver el nombre completo
        const datosFormateados = participaciones.map(p => ({
            id: p.id,
            olimpista: {
                id: p.olimpista?.id,
                nombre_completo: `${p.olimpista?.nombre} ${p.olimpista?.ap_paterno} ${p.olimpista?.ap_materno || ''}`.trim(),
                documento: p.olimpista?.numero_documento,
            },
            area: p.area.nombre,
            nivel: p.nivel.nombre,
            evaluaciones: p.evaluaciones,
            // (Opcional) Puedes remover area_id y nivel_id aquí si no los necesita el frontend
        }));

        res.status(200).json({
            mensaje: 'Datos cargados: Lista de participantes para evaluación obtenida con éxito.',
            total: datosFormateados.length,
            datos: datosFormateados,
        });

    } catch (error) {
        console.error('Error al listar participaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener la lista de participantes.' });
    }
};

/**
 * Endpoint para registrar o actualizar la nota y comentarios de una evaluación.
 * Simula el "botón de guardar" después de calificar.
 * Ruta: POST /api/evaluaciones/registro
 */
export const registrarEvaluacion = async (req: Request, res: Response) => {
    // Los datos ya fueron validados por el middleware
    const { participacionId, faseId, nota, comentario, evaluadorId } = req.body;
    
    // Convertir nota a Decimal. El middleware ya aseguró que es un string con 2 decimales.
    const notaDecimal = parseFloat(nota); 

    try {
        // --- 1. VERIFICACIÓN DE ASIGNACIÓN (SEGURIDAD CRÍTICA) ---
        // 1.1 Obtener área y nivel de la participación para la verificación
        const participacion = await prisma.participacion.findUnique({
            where: { id: participacionId },
            select: { area_id: true, nivel_id: true }
        });

        if (!participacion) {
            return res.status(404).json({ error: 'Participación no encontrada o inválida.' });
        }

        // 1.2 Verificar si el evaluador tiene asignada esta área/nivel
        const asignacionValida = await prisma.asignaciones.findUnique({
            where: {
                usuario_id_area_id_nivel_id: {
                    usuario_id: evaluadorId,
                    area_id: participacion.area_id,
                    nivel_id: participacion.nivel_id
                }
            }
        });

        if (!asignacionValida) {
            return res.status(403).json({ error: 'Acceso denegado. El evaluador no está asignado a esta área y nivel de competencia.' });
        }


        // --- 2. REGISTRO/ACTUALIZACIÓN DE EVALUACIÓN ---
        
        // 2.1 Verificar si ya existe una evaluación para esta participación en esta fase por CUALQUIER evaluador
        // NOTA: La unicidad es [participacion_id, evaluador_id, fase_id]
        const evaluacionExistente = await prisma.evaluaciones.findUnique({
            where: {
                participacion_id_evaluador_id_fase_id: {
                    participacion_id: participacionId,
                    evaluador_id: evaluadorId,
                    fase_id: faseId,
                }
            }
        });

        let evaluacion;

        if (evaluacionExistente) {
            // Si existe, se actualiza la nota y el comentario
            evaluacion = await prisma.evaluaciones.update({
                where: {
                    id: evaluacionExistente.id,
                },
                data: {
                    nota: notaDecimal,
                    comentario: comentario,
                    ultima_modificacion: new Date(), // Nuevo campo de la DB
                }
            });
            return res.status(200).json({
                mensaje: 'Nota y comentarios de evaluación actualizados con éxito.',
                accion: 'ACTUALIZADO',
                evaluacion,
            });
        } else {
            // Si no existe, se crea un nuevo registro
            evaluacion = await prisma.evaluaciones.create({
                data: {
                    participacion_id: participacionId,
                    fase_id: faseId,
                    evaluador_id: evaluadorId,
                    nota: notaDecimal,
                    comentario: comentario,
                },
            });

            return res.status(201).json({
                mensaje: 'Evaluación registrada por primera vez con éxito.',
                accion: 'CREADO',
                evaluacion,
            });
        }

    } catch (error) {
        console.error('Error al registrar/actualizar la evaluación:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar la evaluación.' });
    }
};