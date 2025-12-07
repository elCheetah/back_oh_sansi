import { Request, Response } from "express";
import {
  listarCategoriasConEvaluadoresSrv,
  listarEvaluadoresDisponiblesSrv,
  asignarEvaluadorCategoriaSrv,
  eliminarAsignacionEvaluadorSrv,
} from "../services/designarevaluadores.service";

type AuthRequest = Request & {
  auth?: {
    id: number;
    rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
    correo: string;
    nombreCompleto: string;
  };
};

// Solo ADMIN o RESPONSABLE pueden gestionar asignaciones
function validarRolGestion(req: AuthRequest, res: Response): boolean {
  if (!req.auth) {
    res.status(401).json({
      ok: false,
      codigo: "NO_AUTENTICADO",
      mensaje: "No autenticado.",
    });
    return false;
  }

  if (req.auth.rol !== "ADMINISTRADOR" && req.auth.rol !== "RESPONSABLE") {
    res.status(403).json({
      ok: false,
      codigo: "ROL_NO_AUTORIZADO",
      mensaje: "No tienes permisos para gestionar asignaciones de evaluadores.",
    });
    return false;
  }

  return true;
}

// GET /api/designar-evaluadores?gestion=2025
export async function listarCategoriasConEvaluadoresController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!validarRolGestion(req, res)) return;

    const gestion = req.query.gestion
      ? Number(req.query.gestion)
      : undefined;

    const categorias = await listarCategoriasConEvaluadoresSrv({ gestion });

    return res.json({
      ok: true,
      total: categorias.length,
      categorias,
    });
  } catch (error: any) {
    console.error(
      "Error al listar categorías con evaluadores",
      error
    );

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_CATEGORIAS_EVALUADORES",
      mensaje:
        "Ocurrió un error al listar las categorías con sus evaluadores.",
    });
  }
}

// GET /api/designar-evaluadores/:idCategoria/evaluadores-disponibles?q=...
export async function listarEvaluadoresDisponiblesController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!validarRolGestion(req, res)) return;

    const idCategoria = Number(req.params.idCategoria);
    if (isNaN(idCategoria)) {
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_ID_INVALIDO",
        mensaje: "El id de la categoría no es válido.",
      });
    }

    const q =
      typeof req.query.q === "string" ? req.query.q : undefined;

    const evaluadores = await listarEvaluadoresDisponiblesSrv(
      idCategoria,
      q
    );

    return res.json({
      ok: true,
      total: evaluadores.length,
      evaluadores,
    });
  } catch (error: any) {
    console.error(
      "Error al listar evaluadores disponibles",
      error
    );

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_EVALUADORES_DISPONIBLES",
      mensaje:
        "Ocurrió un error al listar los evaluadores disponibles.",
    });
  }
}

// POST /api/designar-evaluadores/:idCategoria/evaluadores
// Body: { evaluador_id }
export async function asignarEvaluadorCategoriaController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!validarRolGestion(req, res)) return;

    const idCategoria = Number(req.params.idCategoria);
    if (isNaN(idCategoria)) {
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_ID_INVALIDO",
        mensaje: "El id de la categoría no es válido.",
      });
    }

    const evaluadorId = Number(req.body.evaluador_id);

    if (!evaluadorId || isNaN(evaluadorId)) {
      return res.status(400).json({
        ok: false,
        codigo: "EVALUADOR_ID_INVALIDO",
        mensaje: "El id del evaluador no es válido.",
      });
    }

    if (!req.auth) {
      return res.status(401).json({
        ok: false,
        codigo: "NO_AUTENTICADO",
        mensaje: "No autenticado.",
      });
    }

    const { asignacion, reactivada } =
      await asignarEvaluadorCategoriaSrv(
        idCategoria,
        evaluadorId,
        req.auth.id
      );

    return res.status(reactivada ? 200 : 201).json({
      ok: true,
      asignacion,
      reactivada,
      mensaje: reactivada
        ? "Se reactivó la asignación del evaluador a la categoría."
        : "Se asignó el evaluador a la categoría correctamente.",
    });
  } catch (error: any) {
    console.error(
      "Error al asignar evaluador a categoría",
      error
    );

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ASIGNAR_EVALUADOR",
      mensaje:
        "Ocurrió un error al asignar el evaluador a la categoría.",
    });
  }
}

// DELETE /api/designar-evaluadores/:idCategoria/evaluadores/:idEvaluador
export async function eliminarAsignacionEvaluadorController(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!validarRolGestion(req, res)) return;

    const idCategoria = Number(req.params.idCategoria);
    if (isNaN(idCategoria)) {
      return res.status(400).json({
        ok: false,
        codigo: "CATEGORIA_ID_INVALIDO",
        mensaje: "El id de la categoría no es válido.",
      });
    }

    const idEvaluador = Number(req.params.idEvaluador);
    if (isNaN(idEvaluador)) {
      return res.status(400).json({
        ok: false,
        codigo: "EVALUADOR_ID_INVALIDO",
        mensaje: "El id del evaluador no es válido.",
      });
    }

    if (!req.auth) {
      return res.status(401).json({
        ok: false,
        codigo: "NO_AUTENTICADO",
        mensaje: "No autenticado.",
      });
    }

    const { asignacion } = await eliminarAsignacionEvaluadorSrv(
      idCategoria,
      idEvaluador,
      req.auth.id
    );

    return res.json({
      ok: true,
      asignacion,
      mensaje:
        "Se eliminó la asignación del evaluador a la categoría correctamente.",
    });
  } catch (error: any) {
    console.error(
      "Error al eliminar asignación de evaluador",
      error
    );

    if (error.codigo && error.mensaje) {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.mensaje,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ELIMINAR_ASIGNACION_EVALUADOR",
      mensaje:
        "Ocurrió un error al eliminar la asignación del evaluador.",
    });
  }
}
