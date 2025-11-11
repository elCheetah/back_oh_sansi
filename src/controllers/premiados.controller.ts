// src/controllers/premiados.controller.ts
import { Request, Response } from "express";
import { exportarPremiadosSrv, listarPremiadosSrv } from "../services/premiados.service";

export class PremiadosController {
  static async listar(req: Request, res: Response) {
    try {
      const resp = await listarPremiadosSrv(req.query as any);
      return res.json(resp);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? "Error interno" });
    }
  }

  static async exportExcel(req: Request, res: Response) {
    try {
      const { buffer, filename, mime } = await exportarPremiadosSrv(req.query as any, "excel");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? "Error interno" });
    }
  }

  static async exportPDF(req: Request, res: Response) {
    try {
      const { buffer, filename, mime } = await exportarPremiadosSrv(req.query as any, "pdf");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message ?? "Error interno" });
    }
  }
}
