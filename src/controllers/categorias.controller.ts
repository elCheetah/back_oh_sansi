// src/controllers/categorias.controller.ts
import { Request, Response } from "express";
import prisma from "../config/database";
import {
  crearCategoriaSrv,
  eliminarCategoriaSrv,
  listarCategoriasSrv,
  asignarResponsableCategoriaSrv,
  listarResponsablesDisponiblesSrv,
  listarAreasActivasSrv,
  listarNivelesActivosSrv,
} from "../services/categorias.service";

type AuthRequest = Request & {
  auth?: {
    id: number;
    nombreCompleto: string;
    rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
    correo: string;
  };
};

// GET /api/categorias?gestion=2025
// Devuelve: { idCategoria, area, nivel, modalidad, responsable }
export async function listarCategoriasController(
  req: AuthRequest,
  res: Response
) {
  try {
    const currentYear = new Date().getFullYear();
    const gestion = req.query.gestion
      ? Number(req.query.gestion)
      : currentYear;

    const categorias = await listarCategoriasSrv({ gestion });

    const lista = categorias.map((cat: any) => ({
      idCategoria: cat.id,
      area: cat.area.nombre,
      nivel: cat.nivel.nombre,
      modalidad: cat.modalidad,
      responsable: cat.responsable?.nombreCompleto ?? null,
    }));

    return res.json({
      ok: true,
      total: lista.length,
      categorias: lista,
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

// GET /api/categorias/areas
// Devuelve áreas activas: { id, area }
export async function listarAreasActivasController(
  _req: AuthRequest,
  res: Response
) {
  try {
    const areas = await listarAreasActivasSrv();

    const data = areas.map((a: any) => ({
      id: a.id,
      area: a.nombre,
    }));

    return res.json({
      ok: true,
      total: data.length,
      areas: data,
    });
  } catch (error) {
    console.error("Error al listar áreas", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_AREAS",
      mensaje: "Ocurrió un error al listar las áreas",
    });
  }
}

// GET /api/categorias/niveles
// Devuelve niveles activos: { id, nivel }
export async function listarNivelesActivosController(
  _req: AuthRequest,
  res: Response
) {
  try {
    const niveles = await listarNivelesActivosSrv();

    const data = niveles.map((n: any) => ({
      id: n.id,
      nivel: n.nombre,
    }));

    return res.json({
      ok: true,
      total: data.length,
      niveles: data,
    });
  } catch (error) {
    console.error("Error al listar niveles", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_NIVELES",
      mensaje: "Ocurrió un error al listar los niveles",
    });
  }
}

// POST /api/categorias
// Body: { area_id, nivel_id, modalidad } (gestion opcional, por defecto año actual)
export async function crearCategoriaController(
  req: AuthRequest,
  res: Response
) {
  try {
    const { categoria, reactivada } = await crearCategoriaSrv(req.body);

    // Log de creación / reactivación
    const usuarioId = req.auth?.id;
    if (usuarioId) {
      await prisma.logs.create({
        data: {
          entidad: "categoria",
          entidad_id: categoria.id,
          campo: reactivada ? "reactivar" : "crear",
          valor_anterior: reactivada ? "false" : null,
          valor_nuevo: JSON.stringify({
            gestion: categoria.gestion,
            area_id: categoria.area.id,
            nivel_id: categoria.nivel.id,
            modalidad: categoria.modalidad,
          }),
          usuario_id: usuarioId,
          motivo: reactivada
            ? "Reactivación de categoría existente"
            : "Creación de nueva categoría",
        },
      });
    }

    return res.status(reactivada ? 200 : 201).json({
      ok: true,
      categoria,
      reactivada,
    });
  } catch (error: any) {
    console.error("Error al crear categoría", error);

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    if (error.code === "P2002") {
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_DUPLICADA",
        mensaje:
          "Ya existe una categoría con esa gestión, área, nivel y modalidad",
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
// Elimina lógicamente (estado: false) + desactiva asignaciones
export async function eliminarCategoriaController(
  req: AuthRequest,
  res: Response
) {
  try {
    const idCategoria = Number(req.params.idCategoria);

    if (isNaN(idCategoria)) {
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_ID_INVALIDO",
        mensaje: "El id de categoría no es válido",
      });
    }

    const categoriaAntes = await prisma.categorias.findUnique({
      where: { id: idCategoria },
      select: { id: true, estado: true },
    });

    const resultado = await eliminarCategoriaSrv(idCategoria);

    if (!resultado) {
      return res.status(404).json({
        ok: false,
        codigo: "CATEGORIA_NO_ENCONTRADA",
        mensaje: "La categoría no existe",
      });
    }

    const usuarioId = req.auth?.id;
    if (usuarioId && categoriaAntes && categoriaAntes.estado) {
      await prisma.logs.create({
        data: {
          entidad: "categoria",
          entidad_id: idCategoria,
          campo: "estado",
          valor_anterior: "true",
          valor_nuevo: "false",
          usuario_id: usuarioId,
          motivo: "Eliminación lógica de categoría",
        },
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
// Body: { usuario_id }
export async function asignarResponsableCategoriaController(
  req: AuthRequest,
  res: Response
) {
  try {
    const idCategoria = (req as any).idCategoria as number;
    const usuarioId = (req as any).usuarioIdResponsable as number;

    const { categoria, responsableAnteriorId } =
      await asignarResponsableCategoriaSrv(idCategoria, usuarioId);

    // Log de cambio de responsable
    const usuarioAuthId = req.auth?.id;
    if (usuarioAuthId) {
      await prisma.logs.create({
        data: {
          entidad: "categoria",
          entidad_id: idCategoria,
          campo: "responsable",
          valor_anterior: responsableAnteriorId
            ? String(responsableAnteriorId)
            : null,
          valor_nuevo: String(usuarioId),
          usuario_id: usuarioAuthId,
          motivo: "Asignación / cambio de responsable de categoría",
        },
      });
    }

    return res.json({
      ok: true,
      categoria,
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

// GET /api/categorias/responsables/disponibles
// Devuelve usuarios (solo EVALUADOR o RESPONSABLE) sin ninguna asignación activa:
// { idUsuario, nombreCompleto }
export async function listarResponsablesDisponiblesController(
  req: AuthRequest,
  res: Response
) {
  try {
    const gestion = req.query.gestion ? Number(req.query.gestion) : undefined;

    const usuarios = await listarResponsablesDisponiblesSrv({ gestion });

    const data = usuarios.map((u: any) => ({
      idUsuario: u.id,
      nombreCompleto: u.nombreCompleto,
    }));

    return res.json({
      ok: true,
      total: data.length,
      usuarios: data,
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
