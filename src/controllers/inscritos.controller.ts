// src/controllers/inscritos.controller.ts
import { Request, Response } from "express";
import { listarInscritosSrv } from "../services/inscritos.service";
import {
  exportarInscritosExcelSrv,
  exportarInscritosPdfSrv,
} from "../services/inscritos.export";

export const InscritosController = {
  async listar(req: Request, res: Response) {
    const result = await listarInscritosSrv(req.query as any);
    return res.json({ ok: true, ...result });
  },

  async exportarExcel(req: Request, res: Response) {
    const buffer = await exportarInscritosExcelSrv(req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=inscritos.xlsx");
    return res.send(buffer);
  },

  async exportarPdf(req: Request, res: Response) {
    const buffer = await exportarInscritosPdfSrv(req.query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=inscritos.pdf");
    return res.send(buffer);
  },
};
