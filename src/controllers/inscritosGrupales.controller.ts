// src/controllers/inscritosGrupales.controller.ts
import { Request, Response } from "express";
import { InscritosGrupalesService } from "../services/inscritosGrupales.service";

export const InscritosGrupalesController = {
  async listar(req: Request, res: Response) {
    try {
      const data = await InscritosGrupalesService.listar();
      return res.status(200).json({
        ok: true,
        data,
      });
    } catch (error) {
      console.error("Error al listar inscritos grupales:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudieron obtener los inscritos grupales.",
      });
    }
  },

  async bajaParticipacionGrupo(req: Request, res: Response) {
    const { grupoId } = req.params;
    const id = Number(grupoId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El identificador del grupo no es válido.",
      });
    }

    try {
      const { updated } =
        await InscritosGrupalesService.bajaParticipacionGrupo(id);

      if (updated === 0) {
        return res.status(404).json({
          ok: false,
          message:
            "No se encontraron participaciones grupales activas para este grupo.",
        });
      }

      return res.status(200).json({
        ok: true,
        message: "La participación grupal fue actualizada correctamente.",
        affected: updated,
      });
    } catch (error) {
      console.error("Error al dar de baja participación grupal:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo actualizar la participación del grupo.",
      });
    }
  },

  async removerIntegrante(req: Request, res: Response) {
    const { grupoId, olimpistaId } = req.params;
    const gId = Number(grupoId);
    const oId = Number(olimpistaId);

    if (!Number.isInteger(gId) || gId <= 0 || !Number.isInteger(oId) || oId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Los identificadores de grupo u olímpista no son válidos.",
      });
    }

    try {
      const { removed } =
        await InscritosGrupalesService.removerIntegranteDeGrupo(gId, oId);

      if (removed === 0) {
        return res.status(404).json({
          ok: false,
          message: "No se encontró el integrante en el grupo indicado.",
        });
      }

      return res.status(200).json({
        ok: true,
        message: "El integrante fue retirado del grupo correctamente.",
      });
    } catch (error) {
      console.error("Error al remover integrante del grupo:", error);
      return res.status(500).json({
        ok: false,
        message: "No se pudo remover el integrante del grupo.",
      });
    }
  },
};
