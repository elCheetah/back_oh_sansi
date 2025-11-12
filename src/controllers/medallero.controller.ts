import { Request, Response } from "express";
import { buildMedalleroSnapshot, publicarMedalleroSrv, historialMedalleroSrv, medalleroPublicoSrv } from "../services/medallero.service";

export async function previsualizarMedallero(req: Request, res: Response) {
  try {
    const snapshot = await buildMedalleroSnapshot(req.query as any);
    res.json({ ok: true, snapshot });
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err.message ?? "Error al generar snapshot" });
  }
}

export async function publicarMedallero(req: Request, res: Response) {
  try {
    const user = (req as any).usuario; // requireAdmin ya debe setear o validar
    const out = await publicarMedalleroSrv(user?.id ?? 0, req.body || {});
    res.json(out);
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err.message ?? "Error al publicar medallero" });
  }
}

export async function historialMedallero(req: Request, res: Response) {
  try {
    const out = await historialMedalleroSrv();
    res.json(out);
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err.message ?? "Error al listar historial" });
  }
}

export async function medalleroPublico(req: Request, res: Response) {
  try {
    const out = await medalleroPublicoSrv(req.query as any);
    res.json(out);
  } catch (err: any) {
    res.status(400).json({ ok: false, message: err.message ?? "Error al consultar medallero público" });
  }
}
