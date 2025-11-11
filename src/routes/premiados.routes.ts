// src/routes/premiados.routes.ts
import { Router } from "express";
import { PremiadosController } from "../controllers/premiados.controller";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

/**
 * GET /api/premiados
 * Query: area_id, nivel_id, modalidad, search, page, pageSize
 */
router.get("/premiados", requireAdmin, PremiadosController.listar);

/**
 * Exportaciones
 * GET /api/premiados/export/excel
 * GET /api/premiados/export/pdf
 * (mismos filtros por query)
 */
router.get("/premiados/export/excel", requireAdmin, PremiadosController.exportExcel);
router.get("/premiados/export/pdf", requireAdmin, PremiadosController.exportPDF);

export default router;
