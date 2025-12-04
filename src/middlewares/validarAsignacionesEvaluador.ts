// src/middlewares/validarAsignacionesEvaluador.ts
import { Request, Response, NextFunction } from "express";

export function validarParamArea(req: Request, res: Response, next: NextFunction) {
  const areaId = Number(req.params.areaId);
  if (!areaId || isNaN(areaId) || areaId <= 0) {
    return res.status(400).json({
      ok: false,
      codigo: "AREA_ID_INVALIDO",
      mensaje: "El parámetro areaId debe ser un número entero positivo.",
    });
  }
  next();
}

export function validarParamCategoria(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const categoriaId = Number(req.params.categoriaId);
  if (!categoriaId || isNaN(categoriaId) || categoriaId <= 0) {
    return res.status(400).json({
      ok: false,
      codigo: "CATEGORIA_ID_INVALIDO",
      mensaje: "El parámetro categoriaId debe ser un número entero positivo.",
    });
  }
  next();
}

export function validarParamAsignacion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const asignacionId = Number(req.params.asignacionId);
  if (!asignacionId || isNaN(asignacionId) || asignacionId <= 0) {
    return res.status(400).json({
      ok: false,
      codigo: "ASIGNACION_ID_INVALIDO",
      mensaje: "El parámetro asignacionId debe ser un número entero positivo.",
    });
  }
  next();
}

export function validarBodyAsignarCategoria(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const {
    evaluadorPrincipalId,
    evaluadorSecundarioId,
    indiceInicio,
    indiceFin,
  } = req.body;

  if (!evaluadorPrincipalId || isNaN(Number(evaluadorPrincipalId))) {
    return res.status(400).json({
      ok: false,
      codigo: "EVAL_PRINCIPAL_REQUERIDO",
      mensaje: "Debe enviar el ID del evaluador principal.",
    });
  }

  if (evaluadorSecundarioId && isNaN(Number(evaluadorSecundarioId))) {
    return res.status(400).json({
      ok: false,
      codigo: "EVAL_SECUNDARIO_INVALIDO",
      mensaje: "El ID del evaluador secundario no es válido.",
    });
  }

  if (
    evaluadorSecundarioId &&
    Number(evaluadorPrincipalId) === Number(evaluadorSecundarioId)
  ) {
    return res.status(400).json({
      ok: false,
      codigo: "EVALS_IGUALES",
      mensaje: "El evaluador principal y el secundario no pueden ser el mismo.",
    });
  }

  if (
    (indiceInicio !== undefined && indiceInicio !== null) ||
    (indiceFin !== undefined && indiceFin !== null)
  ) {
    const ini = Number(indiceInicio);
    const fin = Number(indiceFin);
    if (isNaN(ini) || isNaN(fin) || ini <= 0 || fin <= 0 || ini > fin) {
      return res.status(400).json({
        ok: false,
        codigo: "RANGO_INVALIDO",
        mensaje:
          "El rango de índices debe ser numérico, positivo y con inicio <= fin.",
      });
    }
  }

  next();
}

export function validarBodyAgregarEvaluador(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { nuevoEvaluadorId, indiceInicio, indiceFin } = req.body;

  if (!nuevoEvaluadorId || isNaN(Number(nuevoEvaluadorId))) {
    return res.status(400).json({
      ok: false,
      codigo: "EVAL_NUEVO_REQUERIDO",
      mensaje: "Debe enviar el ID del evaluador a agregar.",
    });
  }

  if (
    (indiceInicio !== undefined && indiceInicio !== null) ||
    (indiceFin !== undefined && indiceFin !== null)
  ) {
    const ini = Number(indiceInicio);
    const fin = Number(indiceFin);
    if (isNaN(ini) || isNaN(fin) || ini <= 0 || fin <= 0 || ini > fin) {
      return res.status(400).json({
        ok: false,
        codigo: "RANGO_INVALIDO",
        mensaje:
          "El rango de índices debe ser numérico, positivo y con inicio <= fin.",
      });
    }
  }

  next();
}

export function validarBodyCambiarEvaluador(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { nuevoUsuarioId } = req.body;

  if (!nuevoUsuarioId || isNaN(Number(nuevoUsuarioId))) {
    return res.status(400).json({
      ok: false,
      codigo: "EVAL_NUEVO_REQUERIDO",
      mensaje: "Debe enviar el ID del nuevo evaluador.",
    });
  }

  next();
}
