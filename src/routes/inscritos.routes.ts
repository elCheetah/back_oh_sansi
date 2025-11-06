import { Router } from "express";
import { InscritosController } from "../controllers/inscritos.controller";
// import { requireAdmin } from "../middlewares/requireAdmin"; // 🔸 Desactivado temporalmente

const router = Router();

// 🔹 Quita requireAdmin para pruebas locales
router.get("/inscritos", InscritosController.listar);
router.get("/inscritos/export/excel", InscritosController.exportarExcel);
router.get("/inscritos/export/pdf", InscritosController.exportarPdf);

export default router;
