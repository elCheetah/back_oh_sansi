import { Router } from "express";
import {
  crearCategoriaController,
  listarCategoriasController,
  eliminarCategoriaController,
  asignarResponsableCategoriaController,
  listarResponsablesDisponiblesController,
  listarAreasActivasController,
  listarNivelesActivosController,
} from "../controllers/categorias.controller";
import {
  validarCrearCategoria,
  validarAsignarResponsable,
} from "../middlewares/validarCategorias";
import { validateAuth } from "../middlewares/validarAuth";

const router = Router();

// Todas las rutas protegidas con auth
router.use(validateAuth);

// Categorías (lista simple para asignar responsable / tabla front)
router.get("/", listarCategoriasController); // por defecto gestión = año actual

// Catálogos para selects
router.get("/areas", listarAreasActivasController);
router.get("/niveles", listarNivelesActivosController);

// Crear categoría (gestion opcional, default año actual)
router.post("/", validarCrearCategoria, crearCategoriaController);

// Eliminación lógica
router.delete("/:idCategoria", eliminarCategoriaController);

// Usuarios disponibles para ser responsables
router.get(
  "/responsables/disponibles",
  listarResponsablesDisponiblesController
);

// Asignar responsable a categoría
router.put(
  "/:idCategoria/responsable",
  validarAsignarResponsable,
  asignarResponsableCategoriaController
);

export default router;
