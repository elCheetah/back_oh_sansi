// src/controllers/parametrizacionMedallasController.ts
import { Request, Response } from "express";
import {
  listarParametrizacionMedallas,
  guardarConfigMedallas,
  eliminarConfigMedallas,
} from "../services/parametrizacionMedallas.service";

/**
 * GET /api/parametrizacion-medallas
 * Devuelve la tabla completa de combinaciones área+nivel con su configuración (si existe).
 */
export const obtenerTablaParametrizacionMedallas = async (
  _req: Request,
  res: Response
) => {
  try {
    const filas = await listarParametrizacionMedallas();
    return res.json({
      ok: true,
      total: filas.length,
      data: filas,
    });
  } catch (error) {
    console.error("Error al listar parametrización de medallas:", error);
    return res.status(500).json({
      ok: false,
      mensaje:
        "Ocurrió un error al obtener la parametrización de medallas. Intente nuevamente.",
    });
  }
};

/**
 * PUT /api/parametrizacion-medallas/:areaId/:nivelId
 * Crea o actualiza la configuración de medallas para un área+nivel.
 */
export const guardarParametrizacionMedallas = async (
  req: Request,
  res: Response
) => {
  try {
    const areaId = Number(req.params.areaId ?? req.body.areaId);
    const nivelId = Number(req.params.nivelId ?? req.body.nivelId);

    const {
      oros,
      platas,
      bronces,
      menciones = 0,
      notaMinAprobacion,
    } = req.body;

    const config = await guardarConfigMedallas({
      areaId,
      nivelId,
      oros: Number(oros),
      platas: Number(platas),
      bronces: Number(bronces),
      menciones: Number(menciones),
      notaMinAprobacion: Number(notaMinAprobacion),
    });

    return res.json({
      ok: true,
      mensaje: "Configuración de medallas guardada correctamente.",
      data: config,
    });
  } catch (error) {
    console.error("Error al guardar parametrización de medallas:", error);
    return res.status(500).json({
      ok: false,
      mensaje:
        "Ocurrió un error al guardar la configuración de medallas. Intente nuevamente.",
    });
  }
};

/**
 * DELETE /api/parametrizacion-medallas/:areaId/:nivelId
 * Elimina la configuración de medallas (sirve como 'limpiar' la fila).
 */
export const eliminarParametrizacionMedallas = async (
  req: Request,
  res: Response
) => {
  try {
    const areaId = Number(req.params.areaId);
    const nivelId = Number(req.params.nivelId);

    await eliminarConfigMedallas(areaId, nivelId);

    return res.json({
      ok: true,
      mensaje: "Configuración de medallas eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar parametrización de medallas:", error);
    return res.status(500).json({
      ok: false,
      mensaje:
        "Ocurrió un error al eliminar la configuración de medallas. Intente nuevamente.",
    });
  }
};
