// src/routes/inscritosIndividuales.routes.ts
import { Router } from "express";
import { InscritosIndividualesController } from "../controllers/inscritosIndividuales.controller";

const router = Router();

router.get("/", InscritosIndividualesController.listar);

router.patch(
  "/participacion/:olimpistaId/baja",
  InscritosIndividualesController.bajaParticipacion
);

router.patch(
  "/olimpista/:olimpistaId/baja",
  InscritosIndividualesController.bajaOlimpista
);

export default router;
