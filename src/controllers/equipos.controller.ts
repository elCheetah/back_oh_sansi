// src/controllers/equipos.controller.ts
import { Request, Response } from "express";
import { listarMiembrosEquipoSrv } from "../services/equipos.service";

export const EquiposController = {
  async miembros(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "ID_INVALIDO" });
    }

    try {
      const result = await listarMiembrosEquipoSrv(id);
      if (!result.ok) {
        return res.status(404).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error("❌ Error en EquiposController.miembros:", err);
      return res
        .status(500)
        .json({ ok: false, message: "ERROR_LISTAR_MIEMBROS" });
    }
  },
};
