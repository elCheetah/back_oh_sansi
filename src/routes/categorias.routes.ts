import { Router } from "express";
import {
  crearCategoriaController,
  listarCategoriasController,
  eliminarCategoriaController,
  asignarResponsableCategoriaController,
  listarResponsablesDisponiblesController,
} from "../controllers/categorias.controller";
import {
  validarCrearCategoria,
  validarAsignarResponsable,
} from "../middlewares/validarCategorias";
// IMPORTA TU requireAuth / requireRol reales
// import { requireAuth, requireRol } from "../middlewares/auth";

const router = Router();

// Todas las rutas asumo solo ADMIN
// router.use(requireAuth, requireRol(["ADMINISTRADOR"]));

router.get("/", listarCategoriasController); // ?gestion=2025
router.post("/", validarCrearCategoria, crearCategoriaController);
router.delete("/:idCategoria", eliminarCategoriaController);

// responsables
router.get(
  "/responsables/disponibles",
  listarResponsablesDisponiblesController
); // ?gestion=2025

router.put(
  "/:idCategoria/responsable",
  validarAsignarResponsable,
  asignarResponsableCategoriaController
);

export default router;
