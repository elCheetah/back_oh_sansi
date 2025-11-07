import { Request, Response } from "express";
import {
  getEstadoActualSrv,
  abrirFaseSrv,
  cerrarFaseSrv,
  publicarResultadosSrv,
  listarHistorialSrv,
} from "../services/fases.service";

export const FasesController = {
  async estado(req: Request, res: Response) {
    try {
      const data = await getEstadoActualSrv();
      res.json({ ok: true, data });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  async abrir(req: Request, res: Response) {
    try {
      const { fase } = req.body;
      const usuario = (req as any).usuario;
      const adminNombre = `${usuario?.nombre || "ADMIN"}`;

      const data = await abrirFaseSrv(adminNombre, fase);
      res.json({ ok: true, message: "Fase abierta correctamente", data });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  async cerrar(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const adminNombre = `${usuario?.nombre || "ADMIN"}`;

      const data = await cerrarFaseSrv(adminNombre);
      res.json({ ok: true, message: "Fase cerrada correctamente", data });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  async publicar(req: Request, res: Response) {
    try {
      const usuario = (req as any).usuario;
      const adminNombre = `${usuario?.nombre || "ADMIN"}`;

      const data = await publicarResultadosSrv(adminNombre);
      res.json({ ok: true, message: "Resultados publicados correctamente", data });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },

  async historial(req: Request, res: Response) {
    try {
      const data = await listarHistorialSrv();
      res.json({ ok: true, data });
    } catch (err: any) {
      res.status(400).json({ ok: false, message: err.message });
    }
  },
};
