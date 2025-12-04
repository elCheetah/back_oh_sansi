import { Request, Response } from "express";
import {
  crearCategoriaSrv,
  eliminarCategoriaSrv,
  listarCategoriasSrv,
  asignarResponsableCategoriaSrv,
  listarResponsablesDisponiblesSrv,
} from "../services/categorias.service";

// GET /api/categorias?gestion=2025
export async function listarCategoriasController(req: Request, res: Response) {
  try {
    const gestion = req.query.gestion
      ? Number(req.query.gestion)
      : undefined;

    const categorias = await listarCategoriasSrv({ gestion });

    return res.json({
      ok: true,
      total: categorias.length,
      categorias,
    });
  } catch (error) {
    console.error("Error al listar categorías", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_CATEGORIAS",
      mensaje: "Ocurrió un error al listar las categorías",
    });
  }
}

// POST /api/categorias
export async function crearCategoriaController(req: Request, res: Response) {
  try {
    const nuevaCategoria = await crearCategoriaSrv(req.body);

    return res.status(201).json({
      ok: true,
      categoria: nuevaCategoria,
    });
  } catch (error: any) {
    console.error("Error al crear categoría", error);

    if (error.code === "P2002") {
      // unique constraint de Prisma
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_DUPLICADA",
        mensaje:
          "Ya existe una categoría con esa gestión, área, nivel y modalidad",
      });
    }

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_CREAR_CATEGORIA",
      mensaje: "Ocurrió un error al crear la categoría",
    });
  }
}

// DELETE /api/categorias/:idCategoria
export async function eliminarCategoriaController(
  req: Request,
  res: Response
) {
  try {
    const idCategoria = Number(req.params.idCategoria);

    const resultado = await eliminarCategoriaSrv(idCategoria);

    if (!resultado) {
      return res.status(404).json({
        ok: false,
        codigo: "CATEGORIA_NO_ENCONTRADA",
        mensaje: "La categoría no existe",
      });
    }

    return res.json({
      ok: true,
      mensaje: "Categoría eliminada correctamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar categoría", error);

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ELIMINAR_CATEGORIA",
      mensaje: "Ocurrió un error al eliminar la categoría",
    });
  }
}

// PUT /api/categorias/:idCategoria/responsable
export async function asignarResponsableCategoriaController(
  req: Request,
  res: Response
) {
  try {
    const idCategoria = (req as any).idCategoria as number;
    const usuarioId = (req as any).usuarioIdResponsable as number;

    const categoriaActualizada = await asignarResponsableCategoriaSrv(
      idCategoria,
      usuarioId
    );

    return res.json({
      ok: true,
      categoria: categoriaActualizada,
    });
  } catch (error: any) {
    console.error("Error al asignar responsable a categoría", error);

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ASIGNAR_RESPONSABLE",
      mensaje: "Ocurrió un error al asignar el responsable",
    });
  }
}

// GET /api/categorias/responsables/disponibles?gestion=2025
export async function listarResponsablesDisponiblesController(
  req: Request,
  res: Response
) {
  try {
    const gestion = req.query.gestion
      ? Number(req.query.gestion)
      : undefined;

    const responsables = await listarResponsablesDisponiblesSrv({ gestion });

    return res.json({
      ok: true,
      total: responsables.length,
      responsables,
    });
  } catch (error) {
    console.error("Error al listar responsables disponibles", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_RESPONSABLES",
      mensaje: "Ocurrió un error al listar los responsables disponibles",
    });
  }
}
