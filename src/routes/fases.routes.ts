import { Router } from "express";
import { FasesController } from "../controllers/fases.controller";
// import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();


router.get("/fases/estado", FasesController.estado);
router.post("/fases/abrir", FasesController.abrir);
router.post("/fases/cerrar", FasesController.cerrar);
router.post("/fases/publicar", FasesController.publicar);
router.get("/fases/historial", FasesController.historial);

export default router;
