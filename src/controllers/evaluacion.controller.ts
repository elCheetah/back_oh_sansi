import { Request, Response } from 'express';
// Ajusta el path de tu instancia de Prisma Client
import prisma from '../config/database'; 
import { TipoParticipacion, Participacion } from '@prisma/client'; 

// --- Funciones de LISTADO ---

/**
 * Función genérica para listar participaciones filtrando por tipo (INDIVIDUAL o EQUIPO).
 */
const listarParticipaciones = async (req: Request, res: Response, tipoFiltro: TipoParticipacion) => {
    try {
        const { areaId, nivelId, faseId, evaluadorId } = req.query;

        // --- 1. VALIDACIÓN Y FILTRO POR ASIGNACIÓN ---
        const evaluadorIdNum = Number(evaluadorId);
        
        if (isNaN(evaluadorIdNum) || !Number.isInteger(evaluadorIdNum)) {
            return res.status(403).json({ error: 'Falta el ID del evaluador o es inválido.' });
        }

        // Obtener las asignaciones del evaluador (áreas y niveles que puede calificar)
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
        
        // Mapear las asignaciones a filtros de Participación (solo queremos los IDs que coincidan)
        const filtrosAsignacion = asignaciones.map(a => ({
            area_id: a.area_id,
            nivel_id: a.nivel_id
        }));

        const filtrosConsulta: any = {
            OR: filtrosAsignacion, // Filtra solo por las combinaciones asignadas
            tipo: tipoFiltro // FILTRO CLAVE: INDIVIDUAL o EQUIPO
        };
        
        // Aplicar filtros adicionales si vienen de la UI
        if (areaId) filtrosConsulta.area_id = Number(areaId);
        if (nivelId) filtrosConsulta.nivel_id = Number(nivelId);

        // --- 2. CONSULTA PRINCIPAL: Incluir Olimpista, Equipo, Área, Nivel y Evaluaciones ---
        const participaciones = await prisma.participacion.findMany({
            where: filtrosConsulta,
            select: {
                id: true, 
                tipo: true, 
                area_id: true, 
                nivel_id: true, 
                equipo_id: true, 
                olimpista: {
                    select: {
                        nombre: true, 
                        ap_paterno: true, 
                        ap_materno: true,
                        numero_documento: true, 
                    },
                },
                equipo: {
                    select: {
                        nombre: true, 
                    }
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
                evaluaciones: {
                    where: {
                        fase_id: faseId ? Number(faseId) : undefined,
                        evaluador_id: evaluadorIdNum 
                    },
                    select: {
                        nota: true,
                        comentario: true,
                        validado: true,
                    }
                }
            },
            orderBy: {
                id: 'asc'
            }
        });
        
        // --- 3. Mapeo y Formateo de la Respuesta ---
        const datosFormateados = participaciones.map(p => {
            let nombreVisible: string;
            let identificador: string | undefined;

            if (p.tipo === TipoParticipacion.EQUIPO) {
                nombreVisible = p.equipo?.nombre || 'Equipo Desconocido';
                identificador = p.equipo?.nombre; 
            } else {
                const olimpista = p.olimpista;
                nombreVisible = `${olimpista?.nombre || ''} ${olimpista?.ap_paterno || ''} ${olimpista?.ap_materno || ''}`.trim();
                identificador = olimpista?.numero_documento; 
            }
            
            return {
                id: p.id, 
                tipo_participacion: p.tipo,
                nombre_visible: nombreVisible, 
                identificador_principal: identificador,
                area: p.area.nombre,
                nivel: p.nivel.nombre,
                evaluaciones: p.evaluaciones,
            };
        });

        res.status(200).json({
            mensaje: `Lista de participantes de tipo ${tipoFiltro} obtenida con éxito.`,
            total: datosFormateados.length,
            datos: datosFormateados,
        });

    } catch (error) {
        console.error(`Error al listar participaciones de tipo ${tipoFiltro}:`, error);
        res.status(500).json({ error: `Error interno del servidor al obtener la lista de ${tipoFiltro}.` });
    }
};

/**
 * Endpoint para obtener la lista de participaciones individuales (Vista 1).
 * Ruta: GET /api/evaluaciones/individuales
 */
export const listarIndividuales = (req: Request, res: Response) => {
    return listarParticipaciones(req, res, TipoParticipacion.INDIVIDUAL);
};

/**
 * Endpoint para obtener la lista de participaciones por equipos (Vista 2).
 * Ruta: GET /api/evaluaciones/equipos
 */
export const listarEquipos = (req: Request, res: Response) => {
    return listarParticipaciones(req, res, TipoParticipacion.EQUIPO);
};

// --- Funciones de REGISTRO (MANTENIDAS UNIFICADAS) ---

/**
 * Función auxiliar para crear o actualizar una evaluación.
 */
const crearOActualizarEvaluacion = (data: { participacionId: number, evaluadorId: number, faseId: number, nota: number, comentario: string | null }) => {
    const { participacionId, evaluadorId, faseId, nota, comentario } = data;

    // Buscar la evaluación por el Unique Index: [participacion_id, evaluador_id, fase_id]
    return prisma.evaluaciones.findUnique({
        where: {
            participacion_id_evaluador_id_fase_id: {
                participacion_id: participacionId,
                evaluador_id: evaluadorId,
                fase_id: faseId,
            }
        }
    }).then(evaluacionExistente => {
        const evaluacionData = {
            nota: nota,
            comentario: comentario,
        };

        if (evaluacionExistente) {
            // Actualizar
            return prisma.evaluaciones.update({
                where: { id: evaluacionExistente.id },
                data: { ...evaluacionData, ultima_modificacion: new Date() }
            }).then(registroEvaluacion => ({ evaluacion: registroEvaluacion, accion: 'ACTUALIZADO' }));
        } else {
            // Crear
            return prisma.evaluaciones.create({
                data: {
                    participacion_id: participacionId,
                    fase_id: faseId,
                    evaluador_id: evaluadorId,
                    ...evaluacionData,
                }
            }).then(registroEvaluacion => ({ evaluacion: registroEvaluacion, accion: 'CREADO' }));
        }
    });
}


/**
 * Endpoint para registrar o actualizar la nota y comentarios de una evaluación.
 * RUTA CRÍTICA: Aplica la nota a la participación (individual o equipo) y a sus miembros.
 * Ruta: POST /api/evaluaciones/registro
 */
export const registrarEvaluacion = async (req: Request, res: Response) => {
    // Los datos ya fueron validados por el middleware
    const { participacionId, faseId, nota, comentario, evaluadorId } = req.body;
    const notaDecimal = parseFloat(nota); 

    let participacion: any; // Se usa 'any' para evitar errores de tipado con 'select' de Prisma.
    let asignacionValida: any;

    try {
        // --- 1. VERIFICACIÓN DE ASIGNACIÓN (SEGURIDAD CRÍTICA) ---
        participacion = await prisma.participacion.findUnique({
            where: { id: participacionId },
            select: { id: true, tipo: true, area_id: true, nivel_id: true, equipo_id: true }
        });

        if (!participacion) {
            return res.status(404).json({ error: 'Participación no encontrada o inválida.' });
        }

        // Verificar si el evaluador tiene asignada esta área/nivel
        asignacionValida = await prisma.asignaciones.findUnique({
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

        // --- 2. TRANSACCIÓN PARA REGISTRAR NOTA ---
        const dataComun = {
            evaluadorId: evaluadorId,
            faseId: faseId,
            nota: notaDecimal,
            comentario: comentario,
        };

        // Arreglo de promesas de evaluación (la del equipo + las de los miembros)
        const evaluacionesPromises = [];
        let registroEquipo: any;

        // A. Registrar/Actualizar la nota a la PARTICIPACIÓN original (ya sea Individual o Equipo)
        const registroPromise = crearOActualizarEvaluacion({
            participacionId: participacionId,
            ...dataComun
        });
        
        evaluacionesPromises.push(registroPromise);
        
        // B. Lógica condicional: Si es EQUIPO, aplicamos la nota a las participaciones individuales
        let participacionesMiembros: { id: number }[] = [];
        
        if (participacion.tipo === TipoParticipacion.EQUIPO && participacion.equipo_id) {
            
            // 1. Encontrar a todos los miembros del equipo
            const miembros = await prisma.miembrosEquipo.findMany({
                where: { equipo_id: participacion.equipo_id },
                select: { olimpista_id: true }
            });
            
            // 2. Encontrar las participaciones INDIVIDUALES de esos miembros en la misma área/nivel
            const idsOlimpistas = miembros.map(m => m.olimpista_id);

            participacionesMiembros = await prisma.participacion.findMany({
                where: {
                    olimpista_id: { in: idsOlimpistas },
                    area_id: participacion.area_id,
                    nivel_id: participacion.nivel_id,
                    tipo: TipoParticipacion.INDIVIDUAL // Solo las individuales
                },
                select: { id: true }
            });
            
            // 3. Crear o actualizar una evaluación para cada participación individual
            participacionesMiembros.forEach(miembroP => {
                const miembroPromise = crearOActualizarEvaluacion({
                    participacionId: miembroP.id,
                    ...dataComun
                });
                evaluacionesPromises.push(miembroPromise);
            });
        }
        
        // Ejecutar todas las operaciones de forma concurrente
        const resultados = await Promise.all(evaluacionesPromises);
        
        // El primer resultado es siempre el registro de la participación original
        registroEquipo = resultados[0];

        // --- 3. RESPUESTA ---
        const accion = registroEquipo.accion;
        const mensajeBase = accion === 'CREADO' ? 'Evaluación registrada' : 'Evaluación actualizada';
        // Si es Equipo, el número de registros es la participación original + todas las de los miembros
        const numRegistros = participacion.tipo === TipoParticipacion.EQUIPO ? participacionesMiembros.length + 1 : 1;

        return res.status(accion === 'CREADO' ? 201 : 200).json({
            mensaje: `${mensajeBase} con éxito. (Aplicada a ${numRegistros} registros)`,
            accion: accion,
            evaluacion_principal: registroEquipo.evaluacion,
        });


    } catch (error) { 
        // Manejo de errores 
        console.error('Error durante la transacción de registro de evaluación:', error); 
        
        let detalleMensaje = 'Un error desconocido ocurrió.';
        if (error instanceof Error) {
            detalleMensaje = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            detalleMensaje = (error as any).message;
        }
        
        return res.status(500).json({ 
            error: 'Error interno del servidor durante la transacción de evaluación.',
            detalle: detalleMensaje 
        });
    }
};