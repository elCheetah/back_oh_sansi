// src/controllers/inscritosIndividuales.controller.ts
import { Request, Response } from "express";
import { InscritosIndividualesService } from "../services/inscritosIndividuales.service";

export const InscritosIndividualesController = {
  async listar(req: Request, res: Response) {
    try {
      const data = await InscritosIndividualesService.listar();
      return res.status(200).json({
        ok: true,
        data,
      });
    } catch (error) {
      console.error("Error al listar inscritos individuales:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudieron obtener los inscritos individuales.",
      });
    }
  },

  async bajaParticipacion(req: Request, res: Response) {
    const { olimpistaId } = req.params;
    const id = Number(olimpistaId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El identificador del olímpista no es válido.",
      });
    }

    try {
      const { updated } =
        await InscritosIndividualesService.bajaParticipacionPorOlimpista(id);

      if (updated === 0) {
        return res.status(404).json({
          ok: false,
          message:
            "No se encontraron participaciones individuales activas para este olímpista.",
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Participación individual del olímpista actualizada correctamente.",
        affected: updated,
      });
    } catch (error) {
      console.error("Error al dar de baja participación individual:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar la participación del olímpista.",
      });
    }
  },

  async bajaOlimpista(req: Request, res: Response) {
    const { olimpistaId } = req.params;
    const id = Number(olimpistaId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El identificador del olímpista no es válido.",
      });
    }

    try {
      const data = await InscritosIndividualesService.bajaOlimpista(id);
      return res.status(200).json({
        ok: true,
        message: "El olímpista ha sido dado de baja correctamente.",
        data,
      });
    } catch (error: any) {
      console.error("Error al dar de baja al olímpista:", error);

      if (error?.code === "P2025") {
        return res.status(404).json({
          ok: false,
          message: "No se encontró un olímpista con el identificador indicado.",
        });
      }

      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar el estado del olímpista.",
      });
    }
  },
};
