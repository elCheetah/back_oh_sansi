import { Request, Response, NextFunction } from "express";
import { AsignacionesService } from "./../services/asignar-area-nivel.service";
export class UsuariosController {
  static async obtenerDetalle(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarioId = Number(req.params.id);
      const data = await AsignacionesService.obtenerDetalleUsuario(usuarioId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}
