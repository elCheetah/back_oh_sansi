// src/routes/inscritos.routes.ts
import { Router } from "express";
import { InscritosController } from "../controllers/inscritos.controller";

const router = Router();

router.get("/inscritos", InscritosController.listar);
router.get("/inscritos/export/excel", InscritosController.exportarExcel);
router.get("/inscritos/export/pdf", InscritosController.exportarPdf);

export default router;
