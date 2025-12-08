import { Request, Response } from "express";
import {
  getCategoriasAsignadasParaEvaluacion,
  getParticipantesAsignadosEnCategoria,
  guardarNotaEvaluacion,
  descalificarParticipacion,
} from "../services/evaluaciones.service";
import { TipoFase } from "@prisma/client";

export const listarCategoriasAsignadasController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "No autorizado.",
      });
    }

    const data = await getCategoriasAsignadasParaEvaluacion(auth.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Error al obtener las categorías asignadas para evaluación.",
    });
  }
};

export const listarParticipantesAsignadosController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "No autorizado.",
      });
    }

    const { categoriaId, tipoFase } = req.query;

    if (!categoriaId || !tipoFase) {
      return res.status(400).json({
        success: false,
        message: "Los parámetros categoriaId y tipoFase son obligatorios.",
      });
    }

    const tipoFaseEnum =
      tipoFase === "FINAL"
        ? TipoFase.FINAL
        : TipoFase.CLASIFICATORIA;

    const data = await getParticipantesAsignadosEnCategoria({
      usuarioId: auth.id,
      categoriaId: Number(categoriaId),
      tipoFase: tipoFaseEnum,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Error al obtener los participantes asignados para evaluación.",
    });
  }
};

export const guardarEvaluacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "No autorizado.",
      });
    }

    const { idParticipacion, tipoFase, nota, comentario } = req.body || {};

    if (!idParticipacion || !tipoFase || typeof nota !== "number") {
      return res.status(400).json({
        success: false,
        message:
          "Los campos idParticipacion, tipoFase y nota son obligatorios.",
      });
    }

    const tipoFaseEnum =
      tipoFase === "FINAL" ? TipoFase.FINAL : TipoFase.CLASIFICATORIA;

    const resultado = await guardarNotaEvaluacion({
      usuarioId: auth.id,
      idParticipacion: Number(idParticipacion),
      tipoFase: tipoFaseEnum,
      nota: Number(nota),
      comentario,
    });

    return res.status(200).json({
      success: true,
      message: "Evaluación guardada correctamente.",
      data: resultado,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message || "Error al guardar la evaluación.",
    });
  }
};

export const descalificarParticipacionController = async (
  req: Request,
  res: Response
) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "No autorizado.",
      });
    }

    const { idParticipacion, motivo, tipoFase } = req.body || {};

    if (!idParticipacion || !motivo || !tipoFase) {
      return res.status(400).json({
        success: false,
        message:
          "Los campos idParticipacion, motivo y tipoFase son obligatorios para descalificar.",
      });
    }

    if (tipoFase !== "CLASIFICATORIA" && tipoFase !== "FINAL") {
      return res.status(400).json({
        success: false,
        message: "El campo tipoFase debe ser 'CLASIFICATORIA' o 'FINAL'.",
      });
    }

    const tipoFaseEnum =
      tipoFase === "FINAL" ? TipoFase.FINAL : TipoFase.CLASIFICATORIA;

    const resultado = await descalificarParticipacion({
      usuarioId: auth.id,
      idParticipacion: Number(idParticipacion),
      motivo: String(motivo),
      tipoFase: tipoFaseEnum,
    });

    return res.status(200).json({
      success: true,
      message: "Participación descalificada correctamente.",
      data: resultado,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message || "Error al descalificar la participación.",
    });
  }
};
