// src/controllers/asignacionesEvaluador.controller.ts
import { Request, Response } from "express";
import {
  listarCategoriasPorAreaSrv,
  listarEvaluadoresDisponiblesSrv,
  asignarEvaluadoresCategoriaSrv,
  agregarEvaluadorCategoriaSrv,
  cambiarEvaluadorSrv,
  quitarAsignacionSrv,
  ServiceError,
} from "../services/asignacionesEvaluador.service";

function manejarError(e: any, res: Response) {
  if (e instanceof ServiceError) {
    return res.status(e.status).json({
      ok: false,
      codigo: e.code,
      mensaje: e.message,
    });
  }

  console.error(e);
  return res.status(500).json({
    ok: false,
    codigo: "ERROR_INESPERADO",
    mensaje: "Ocurrió un error inesperado, intente nuevamente.",
  });
}

export async function listarCategoriasPorAreaCtrl(req: Request, res: Response) {
  const areaId = Number(req.params.areaId);
  const gestion = req.query.gestion ? Number(req.query.gestion) : undefined;

  try {
    const data = await listarCategoriasPorAreaSrv(areaId, gestion);
    return res.json({ ok: true, ...data });
  } catch (e) {
    return manejarError(e, res);
  }
}

export async function listarEvaluadoresDisponiblesCtrl(
  req: Request,
  res: Response
) {
  const categoriaId = Number(req.params.categoriaId);

  try {
    const data = await listarEvaluadoresDisponiblesSrv(categoriaId);
    return res.json({ ok: true, ...data });
  } catch (e) {
    return manejarError(e, res);
  }
}

export async function asignarEvaluadoresCategoriaCtrl(
  req: Request,
  res: Response
) {
  const categoriaId = Number(req.params.categoriaId);
  const {
    evaluadorPrincipalId,
    evaluadorSecundarioId,
    indiceInicio,
    indiceFin,
  } = req.body;

  try {
    const data = await asignarEvaluadoresCategoriaSrv({
      categoriaId,
      evaluadorPrincipalId: Number(evaluadorPrincipalId),
      evaluadorSecundarioId: evaluadorSecundarioId
        ? Number(evaluadorSecundarioId)
        : undefined,
      indiceInicio:
        indiceInicio !== undefined && indiceInicio !== null
          ? Number(indiceInicio)
          : null,
      indiceFin:
        indiceFin !== undefined && indiceFin !== null
          ? Number(indiceFin)
          : null,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Evaluador(es) asignado(s) correctamente.",
      ...data,
    });
  } catch (e) {
    return manejarError(e, res);
  }
}

export async function agregarEvaluadorCategoriaCtrl(
  req: Request,
  res: Response
) {
  const categoriaId = Number(req.params.categoriaId);
  const { nuevoEvaluadorId, indiceInicio, indiceFin } = req.body;

  try {
    const data = await agregarEvaluadorCategoriaSrv({
      categoriaId,
      nuevoEvaluadorId: Number(nuevoEvaluadorId),
      indiceInicio:
        indiceInicio !== undefined && indiceInicio !== null
          ? Number(indiceInicio)
          : null,
      indiceFin:
        indiceFin !== undefined && indiceFin !== null
          ? Number(indiceFin)
          : null,
    });

    return res.status(201).json({
      ok: true,
      mensaje: "Evaluador agregado correctamente.",
      ...data,
    });
  } catch (e) {
    return manejarError(e, res);
  }
}

export async function cambiarEvaluadorCtrl(req: Request, res: Response) {
  const asignacionId = Number(req.params.asignacionId);
  const { nuevoUsuarioId } = req.body;

  try {
    const data = await cambiarEvaluadorSrv({
      asignacionId,
      nuevoUsuarioId: Number(nuevoUsuarioId),
    });

    return res.json({
      ok: true,
      mensaje: "Evaluador cambiado correctamente.",
      ...data,
    });
  } catch (e) {
    return manejarError(e, res);
  }
}

export async function quitarAsignacionCtrl(req: Request, res: Response) {
  const asignacionId = Number(req.params.asignacionId);

  try {
    const data = await quitarAsignacionSrv(asignacionId);
    return res.json({
      ok: true,
      mensaje: "Asignación quitada correctamente.",
      ...data,
    });
  } catch (e) {
    return manejarError(e, res);
  }
}
