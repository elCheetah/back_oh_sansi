// src/controllers/aprobacionCalificaciones.controller.ts
import { Request, Response } from "express";
import {
  listarListasPendientesSrv,
  obtenerDetalleListaSrv,
  aprobarListaSrv,
  rechazarListaSrv,
} from "../services/aprobacionCalificaciones.service";

function getUsuarioId(req: Request): number {
  // ADAPTA ESTO a cómo guardas el usuario en el request
  // en tu proyecto creo que usas algo como req.usuario.id
  const anyReq = req as any;
  return anyReq.usuario?.id ?? 1;
}

/**
 * GET /api/aprobacion-calificaciones/listas-pendientes
 */
export async function listarListasPendientesCtrl(req: Request, res: Response) {
  try {
    const listas = await listarListasPendientesSrv();
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
