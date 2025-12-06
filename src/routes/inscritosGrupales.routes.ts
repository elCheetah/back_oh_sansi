// src/routes/inscritosGrupales.routes.ts
import { Router } from "express";
import { InscritosGrupalesController } from "../controllers/inscritosGrupales.controller";

const router = Router();

router.get("/", InscritosGrupalesController.listar);

router.patch(
  "/grupo/:grupoId/baja-participacion",
  InscritosGrupalesController.bajaParticipacionGrupo
);

router.delete(
  "/grupo/:grupoId/integrante/:olimpistaId",
  InscritosGrupalesController.removerIntegrante
);

export default router;
