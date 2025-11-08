import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateAuth } from "../middlewares/validarAuth";
import { validateLoginBody } from "../middlewares/auth.middleware";

const router = Router();

// Login: NO requiere token, solo formato del body
router.post("/login", validateLoginBody, AuthController.login);

// Rutas protegidas: requieren token válido
router.post("/logout", validateAuth, AuthController.logout);
router.get("/me", validateAuth, AuthController.me);

export default router;
