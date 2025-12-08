// src/controllers/aprobarCalificaciones.controller.ts
import { Request, Response } from "express";
import {
  getResumenAprobacionCategoriaSrv,
  getTablaAprobacionPorEvaluadorSrv,
  aprobarEvaluacionSrv,
  rechazarEvaluacionSrv,
  getParticipantesCategoriaResponsableSrv,
} from "../services/aprobarCalificaciones.service";
import { TipoFase } from "@prisma/client";


export const obtenerResumenAprobacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    if (auth.rol !== "RESPONSABLE") {
      return res.status(403).json({
        ok: false,
        message:
          "Solo los usuarios con rol RESPONSABLE pueden aprobar calificaciones.",
      });
    }

    const resp = await getResumenAprobacionCategoriaSrv(auth.id);
    return res.status(200).json(resp);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message:
        error?.message ||
        "Error al obtener el resumen de aprobación de calificaciones.",
    });
  }
};

export const obtenerTablaAprobacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    if (auth.rol !== "RESPONSABLE") {
      return res.status(403).json({
        ok: false,
        message:
          "Solo los usuarios con rol RESPONSABLE pueden aprobar calificaciones.",
      });
    }

    const { evaluadorId, tipoFase } = req.query;

    if (!evaluadorId || !tipoFase) {
      return res.status(400).json({
        ok: false,
        message:
          "Los parámetros evaluadorId y tipoFase son obligatorios.",
      });
    }

    const tipoFaseEnum =
      tipoFase === "FINAL"
        ? TipoFase.FINAL
        : TipoFase.CLASIFICATORIA;

    const resp = await getTablaAprobacionPorEvaluadorSrv({
      responsableId: auth.id,
      evaluadorId: Number(evaluadorId),
      tipoFase: tipoFaseEnum,
    });

    return res.status(200).json(resp);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message:
        error?.message ||
        "Error al obtener la tabla de aprobación de calificaciones.",
    });
  }
};

export const aprobarEvaluacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    if (auth.rol !== "RESPONSABLE") {
      return res.status(403).json({
        ok: false,
        message:
          "Solo los usuarios con rol RESPONSABLE pueden aprobar calificaciones.",
      });
    }

    const { idEvaluacion } = req.params;
    if (!idEvaluacion) {
      return res.status(400).json({
        ok: false,
        message: "El parámetro idEvaluacion es obligatorio.",
      });
    }

    const resp = await aprobarEvaluacionSrv({
      responsableId: auth.id,
      idEvaluacion: Number(idEvaluacion),
    });

    const status = resp.ok ? 200 : 400;
    return res.status(status).json(resp);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message:
        error?.message || "Error al aprobar la evaluación.",
    });
  }
};

export const rechazarEvaluacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    if (auth.rol !== "RESPONSABLE") {
      return res.status(403).json({
        ok: false,
        message:
          "Solo los usuarios con rol RESPONSABLE pueden rechazar calificaciones.",
      });
    }

    const { idEvaluacion } = req.params;
    if (!idEvaluacion) {
      return res.status(400).json({
        ok: false,
        message: "El parámetro idEvaluacion es obligatorio.",
      });
    }

    const resp = await rechazarEvaluacionSrv({
      responsableId: auth.id,
      idEvaluacion: Number(idEvaluacion),
    });

    const status = resp.ok ? 200 : 400;
    return res.status(status).json(resp);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message:
        error?.message || "Error al rechazar la evaluación.",
    });
  }
};

export const listarParticipantesCategoriaResponsableController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    if (auth.rol !== "RESPONSABLE") {
      return res.status(403).json({
        ok: false,
        message:
          "Solo los usuarios con rol RESPONSABLE pueden listar los participantes de su categoría.",
      });
    }

    const resp = await getParticipantesCategoriaResponsableSrv(auth.id);

    const status = resp.ok ? 200 : 400;
    return res.status(status).json(resp);
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message:
        error?.message ||
        "Error al listar los participantes de la categoría.",
    });
  }
};
