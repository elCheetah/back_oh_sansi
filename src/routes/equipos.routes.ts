// src/routes/equipos.routes.ts
import { Router } from "express";
import { EquiposController } from "../controllers/equipos.controller";

const router = Router();

// GET /api/equipos/:id/miembros
router.get("/equipos/:id/miembros", EquiposController.miembros);

export default router;
