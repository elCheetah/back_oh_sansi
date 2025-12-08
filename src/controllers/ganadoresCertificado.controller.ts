// src/controllers/ganadoresCertificado.controller.ts
import { Request, Response } from "express";
import {
  obtenerGanadoresCertificado,
  enviarCorreosGanadoresCertificado,
} from "../services/ganadoresCertificado.service";

export const consultarGanadoresCertificadoController = async (
  req: Request,
  res: Response
) => {
  try {
    const { area, nivel } = req.query;

    if (!area || !nivel) {
      return res.status(400).json({
        success: false,
        message: "Los parámetros area y nivel son obligatorios.",
      });
    }

    // El service YA devuelve el DTO plano para el front:
    // GanadoresCertificadoPlanoResponseDTO
    const data = await obtenerGanadoresCertificado(
      String(area),
      String(nivel)
    );

    return res.status(200).json({
      success: true,
      message: "Ganadores obtenidos correctamente.",
      data, // <-- se devuelve tal cual lo arma el service
    });
  } catch (error: any) {
    const message =
      error.message ||
      "Error al consultar los ganadores de certificados.";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const enviarCorreosGanadoresCertificadoController = async (
  req: Request,
  res: Response
) => {
  try {
    const { area, nivel } = req.body;

    if (!area || !nivel) {
      return res.status(400).json({
        success: false,
        message: "Los campos area y nivel son obligatorios.",
      });
    }

    const auth: any = (req as any).auth;
    if (!auth || !auth.id) {
      return res.status(401).json({
        success: false,
        message: "No autorizado.",
      });
    }

    // El service también retorna un DTO listo (ResultadoEnvioCorreosDTO)
    const resultado = await enviarCorreosGanadoresCertificado(
      String(area),
      String(nivel),
      auth.id
    );

    return res.status(200).json({
      success: true,
      message: "Correos a ganadores procesados correctamente.",
      data: resultado,
    });
  } catch (error: any) {
    const message =
      error.message || "Error al enviar correos a los ganadores.";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};
