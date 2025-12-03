// src/controllers/dashboardEvaluador.controller.ts
import { Request, Response } from "express";
import { DashboardEvaluadorService } from "../services/dashboardEvaluador.service";

export const getDashboardEvaluador = async (req: Request, res: Response) => {
  try {
    const user = req.auth;

    if (!user || user.rol !== "EVALUADOR") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado. Solo para evaluadores.",
      });
    }

    const data = await DashboardEvaluadorService.getStats(user.id);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error en dashboard evaluador:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al obtener estadísticas",
    });
  }
};