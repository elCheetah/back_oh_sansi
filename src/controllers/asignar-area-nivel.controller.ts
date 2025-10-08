import { Request, Response, NextFunction } from "express";
import { AsignacionesService } from "./../services/asignar-area-nivel.service";

export class AsignacionesController {
  static async obtenerTabla(_req: Request, res: Response, next: NextFunction) {
    try {
      const filas = await AsignacionesService.obtenerTabla();
      res.json({ columnas: ["Usuario", "Rol", "Area", "Nivel"], filas });
    } catch (err) {
      next(err);
    }
  }

  static async detalleUsuario(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = Number(req.params.usuarioId);
      const data = await AsignacionesService.obtenerDetalleUsuario(usuarioId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  static async designar(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).actorId as number;
      const { usuarioId, areaId, nivelId, rol, motivo } = req.body;
      const resultado = await AsignacionesService.designar({
        actorId,
        usuarioId,
        areaId,
        nivelId,
        rol,
        motivo,
      });
      res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).actorId as number;
      const asignacionId = Number(req.params.asignacionId);
      const motivo = (req.query?.motivo as string) || undefined;

      const out = await AsignacionesService.eliminarAsignacion({ actorId, asignacionId, motivo });
      res.json(out);
    } catch (err) {
      next(err);
    }
  }
}
