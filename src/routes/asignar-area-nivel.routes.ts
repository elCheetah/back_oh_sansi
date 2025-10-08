import { Router } from "express";
import { AsignacionesController } from "./../controllers/asignar-area-nivel.controller";
import { actorRequerido } from "../middlewares/actorRequerido";
import { validarAsignacion } from "../middlewares/validarAsignacion-Area-Nivel";
import { CatalogosController } from "../controllers/catalogo-asigancion-area-nivel.controller";

const router = Router();
/**
 * GET /asignaciones/lista
 * Devuelve: columnas + filas con Usuario, Rol, Área, Nivel (o "Sin designar")
 */
router.get("/lista", AsignacionesController.obtenerTabla);

/**
 * GET /asignaciones/usuario/:usuarioId
 * Devuelve datos por defecto para el modal (nombre completo, rol actual, área/nivel actuales si existen).
 */
router.get("/usuario/:usuarioId", AsignacionesController.detalleUsuario);
/**
 * POST /asignaciones/designar
 * Body: { usuarioId, areaId, nivelId, rol, motivo? }
 * Requiere: header x-usuario-id (actor)
 */
router.post("/designar", actorRequerido, validarAsignacion, AsignacionesController.designar);
/**
 * DELETE /asignaciones/:asignacionId
 * Borrado físico SOLO de la asignación (no toca rol del usuario).
 * Requiere: header x-usuario-id (actor)
 * Query opcional: ?motivo=texto
 */
router.delete("/:asignacionId", actorRequerido, AsignacionesController.eliminar);
/**
 * GET /catalogos/areas
 * Lista de áreas activas (para el select)
 */
router.get("/areas", CatalogosController.areas);
/**
 * GET /catalogos/niveles
 * Lista de niveles activos (para el select)
 */
router.get("/niveles", CatalogosController.niveles);
/**
 * GET /catalogos/roles
 * Solo 'RESPONSABLE' y 'EVALUADOR'
 */
router.get("/roles", CatalogosController.roles);

export default router;