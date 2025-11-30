// src/routes/aprobacionCalificaciones.routes.ts
import { Router } from "express";
import {
  listarListasPendientesCtrl,
  obtenerDetalleListaCtrl,
  aprobarListaCtrl,
  rechazarListaCtrl,
} from "../controllers/aprobacionCalificaciones.controller";
// si tienes middleware de auth/roles, los importas aquí
// import { requireAuth, requireResponsable } from "../middlewares/auth.middleware";

const router = Router();

// Ejemplo con auth, si lo quieres:
// router.use(requireAuth, requireResponsable);

// GET /api/aprobacion-calificaciones/listas-pendientes
router.get(
  "/aprobacion-calificaciones/listas-pendientes",
  listarListasPendientesCtrl
);

// GET /api/aprobacion-calificaciones/:listaId
router.get("/aprobacion-calificaciones/:listaId", obtenerDetalleListaCtrl);

// POST /api/aprobacion-calificaciones/:listaId/aprobar
router.post("/aprobacion-calificaciones/:listaId/aprobar", aprobarListaCtrl);

// POST /api/aprobacion-calificaciones/:listaId/rechazar
router.post("/aprobacion-calificaciones/:listaId/rechazar", rechazarListaCtrl);

export default router;
