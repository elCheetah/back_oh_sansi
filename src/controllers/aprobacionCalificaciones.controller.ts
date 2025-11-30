import { Request, Response } from "express";
import {
  listarListasPendientesSrv,
  obtenerDetalleListaSrv,
  aprobarListaSrv,
  rechazarListaSrv,
} from "../services/aprobacionCalificaciones.service";

function getUsuarioId(req: Request): number {
  // ADAPTA ESTO a cómo guardas el usuario en el request
  const anyReq = req as any;
  return anyReq.usuario?.id ?? 1;
}

/**
 * GET /api/aprobacion-calificaciones/listas-pendientes
 * Opcional:
 *   ?areaId=2  → solo listas de esa área
 *   ?faseId=1  → solo esa fase (1 = Clasificatoria, 2 = Final, etc.)
 */
export async function listarListasPendientesCtrl(req: Request, res: Response) {
  try {
    const { areaId, faseId } = req.query;

    const areaIdNum =
      typeof areaId === "string" && areaId.trim() !== ""
        ? Number(areaId)
        : undefined;

    const faseIdNum =
      typeof faseId === "string" && faseId.trim() !== ""
        ? Number(faseId)
        : undefined;

    const listas = await listarListasPendientesSrv({
      areaId: !Number.isNaN(areaIdNum!) && areaIdNum! > 0 ? areaIdNum : undefined,
      faseId: !Number.isNaN(faseIdNum!) && faseIdNum! > 0 ? faseIdNum : undefined,
    });

    return res.json({
      ok: true,
      total: listas.length,
      listas,
    });
  } catch (err: any) {
    console.error("[listarListasPendientesCtrl] error", err);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al listar las calificaciones pendientes",
      detalle: err.message,
    });
  }
}

/**
 * GET /api/aprobacion-calificaciones/:listaId
 */
export async function obtenerDetalleListaCtrl(req: Request, res: Response) {
  try {
    const { listaId } = req.params;
    const data = await obtenerDetalleListaSrv(listaId);

    if (!data) {
      return res.status(404).json({
        ok: false,
        mensaje: "No se encontraron calificaciones para esta lista",
      });
    }

    return res.json({
      ok: true,
      header: data.header,
      calificaciones: data.calificaciones,
    });
  } catch (err: any) {
    console.error("[obtenerDetalleListaCtrl] error", err);
    return res.status(400).json({
      ok: false,
      mensaje: "Error al obtener el detalle de la lista",
      detalle: err.message,
    });
  }
}

/**
 * POST /api/aprobacion-calificaciones/:listaId/aprobar
 */
export async function aprobarListaCtrl(req: Request, res: Response) {
  try {
    const { listaId } = req.params;
    const usuarioId = getUsuarioId(req);

    const { cantidad } = await aprobarListaSrv(listaId, usuarioId);

    return res.json({
      ok: true,
      mensaje: `Lista aprobada correctamente (${cantidad} evaluaciones actualizadas).`,
    });
  } catch (err: any) {
    console.error("[aprobarListaCtrl] error", err);
    return res.status(400).json({
      ok: false,
      mensaje: "Error al aprobar la lista",
      detalle: err.message,
    });
  }
}

/**
 * POST /api/aprobacion-calificaciones/:listaId/rechazar
 * body: { justificacion: string }
 */
export async function rechazarListaCtrl(req: Request, res: Response) {
  try {
    const { listaId } = req.params;
    const { justificacion } = req.body;
    const usuarioId = getUsuarioId(req);

    if (!justificacion || !String(justificacion).trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: "La justificación es obligatoria para rechazar la lista.",
      });
    }

    await rechazarListaSrv(listaId, usuarioId, String(justificacion).trim());

    return res.json({
      ok: true,
      mensaje: "La lista fue rechazada y se registró la justificación.",
    });
  } catch (err: any) {
    console.error("[rechazarListaCtrl] error", err);
    return res.status(400).json({
      ok: false,
      mensaje: "Error al rechazar la lista",
      detalle: err.message,
    });
  }
}
