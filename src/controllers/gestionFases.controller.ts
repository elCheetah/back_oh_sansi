// src/controllers/gestionFases.controller.ts
import { Request, Response } from "express";
import {
  AccionFase,
  crearGestionConFases,
  listarGestionesFases,
  actualizarGestionFases,
  gestionarFasePorAccion,
} from "../services/gestionFases.service";

// POST /api/gestion-fases
export const crearGestionFasesController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    const { descripcion, inicio, fin } = req.body;

    if (!descripcion || typeof descripcion !== "string") {
      return res.status(400).json({
        success: false,
        message: "La descripción de la gestión es obligatoria.",
      });
    }

    if (!inicio || !fin) {
      return res.status(400).json({
        success: false,
        message: "Las fechas de inicio y fin son obligatorias.",
      });
    }

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Las fechas de inicio y fin no son válidas.",
      });
    }

    const gestion = await crearGestionConFases(
      {
        descripcion: descripcion.trim(),
        inicio: fechaInicio,
        fin: fechaFin,
      },
      req.auth.id
    );

    return res.status(201).json({
      success: true,
      message: "Gestión y fases creadas correctamente.",
      data: gestion,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error al crear la gestión y sus fases.",
    });
  }
};

// GET /api/gestion-fases
// SIN limitar por años
export const listarGestionesFasesController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    const gestiones = await listarGestionesFases();

    return res.status(200).json({
      success: true,
      data: gestiones,
      total: gestiones.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error al listar las gestiones de fases.",
    });
  }
};

// PATCH /api/gestion-fases/:gestion
export const actualizarGestionFasesController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    const gestionParam = req.params.gestion;
    const gestion = parseInt(gestionParam, 10);

    if (!gestion || isNaN(gestion)) {
      return res.status(400).json({
        success: false,
        message: "El parámetro gestión no es válido.",
      });
    }

    const { descripcion, inicio, fin } = req.body;

    const cambios: { descripcion?: string; inicio?: Date; fin?: Date } = {};

    if (descripcion && typeof descripcion === "string") {
      cambios.descripcion = descripcion.trim();
    }

    if (inicio) {
      const fechaInicio = new Date(inicio);
      if (isNaN(fechaInicio.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La fecha de inicio no es válida.",
        });
      }
      cambios.inicio = fechaInicio;
    }

    if (fin) {
      const fechaFin = new Date(fin);
      if (isNaN(fechaFin.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La fecha de fin no es válida.",
        });
      }
      cambios.fin = fechaFin;
    }

    if (!cambios.descripcion && !cambios.inicio && !cambios.fin) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar al menos un campo para actualizar.",
      });
    }

    const gestionActualizada = await actualizarGestionFases(
      gestion,
      cambios,
      req.auth.id
    );

    return res.status(200).json({
      success: true,
      message: "Gestión actualizada correctamente.",
      data: gestionActualizada,
    });
  } catch (error: any) {
    const message =
      error.message ||
      "Error al actualizar la información de la gestión y sus fases.";
    if (message.startsWith("No se encontraron fases")) {
      return res.status(404).json({ success: false, message });
    }
    return res.status(500).json({ success: false, message });
  }
};

// PATCH /api/gestion-fases/fase/:id/accion
export const gestionarFaseAccionController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ success: false, message: "No autorizado." });
    }

    const faseIdParam = req.params.id;
    const faseId = parseInt(faseIdParam, 10);

    if (!faseId || isNaN(faseId)) {
      return res.status(400).json({
        success: false,
        message: "El identificador de la fase no es válido.",
      });
    }

    const { accion, motivo } = req.body;

    const accionesValidas: AccionFase[] = [
      "ABRIR",
      "CERRAR",
      "PUBLICAR",
      "QUITAR_PUBLICACION",
    ];

    if (!accion || !accionesValidas.includes(accion)) {
      return res.status(400).json({
        success: false,
        message:
          "La acción indicada no es válida. Acciones permitidas: ABRIR, CERRAR, PUBLICAR, QUITAR_PUBLICACION.",
      });
    }

    const faseActualizada = await gestionarFasePorAccion(
      faseId,
      accion,
      req.auth.id,
      typeof motivo === "string" ? motivo : undefined
    );

    return res.status(200).json({
      success: true,
      message: "Fase actualizada correctamente.",
      data: faseActualizada,
    });
  } catch (error: any) {
    const message = error.message || "Error al gestionar el estado de la fase.";
    if (
      message.startsWith("La fase indicada no existe") ||
      message.includes("no existe")
    ) {
      return res.status(404).json({ success: false, message });
    }

    if (
      message.includes("ya se encuentra") ||
      message.includes("No es posible") ||
      message.includes("debe estar")
    ) {
      return res.status(400).json({ success: false, message });
    }

    return res.status(500).json({ success: false, message });
  }
};
