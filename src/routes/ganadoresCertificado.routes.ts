import { Router } from "express";
import {
  consultarGanadoresCertificadoController,
  enviarCorreosGanadoresCertificadoController,
} from "../controllers/ganadoresCertificado.controller";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

router.get("/", consultarGanadoresCertificadoController);

router.post(
  "/enviar-correos",
  validateAuth,
  enviarCorreosGanadoresCertificadoController
);

export default router;
