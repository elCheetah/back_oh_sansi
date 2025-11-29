// src/controllers/gestionEvaluador.controller.ts
import { Request, Response } from "express";
import {
  listarGestionEvaluadoresService,
  actualizarEstadoGestionEvaluadorService,
} from "../services/gestionEvaluador.service";

export async function listarGestionEvaluadoresController(
  req: Request,
  res: Response
) {
  try {
    const data = await listarGestionEvaluadoresService();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("[listarGestionEvaluadoresController]", error);
    return res
      .status(500)
      .json({ ok: false, message: "Error al obtener evaluadores" });
  }
}

export async function actualizarEstadoGestionEvaluadorController(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);
    const { habilitado } = req.body as { habilitado?: boolean };

    if (!Number.isInteger(id)) {
      return res
        .status(400)
        .json({ ok: false, message: "ID de evaluador inválido" });
    }

    if (typeof habilitado !== "boolean") {
      return res.status(400).json({
        ok: false,
        message: "El campo 'habilitado' es obligatorio y debe ser booleano",
      });
    }

    const data = await actualizarEstadoGestionEvaluadorService(id, habilitado);
    return res.json({ ok: true, data });
  } catch (error: any) {
    console.error("[actualizarEstadoGestionEvaluadorController]", error);

    if (error.message === "EVALUADOR_NO_ENCONTRADO") {
      return res
        .status(404)
        .json({ ok: false, message: "Evaluador no encontrado" });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al actualizar estado del evaluador",
    });
  }
}
