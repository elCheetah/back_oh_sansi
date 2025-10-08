import { Request, Response, NextFunction } from "express";
import { AsignacionesService } from "./../services/asignar-area-nivel.service";

export class CatalogosController {
  static async areas(_req: Request, res: Response, next: NextFunction) {
    try {
      const lista = await AsignacionesService.listarAreasActivas();
      res.json(lista);
    } catch (err) {
      next(err);
    }
  }

  static async niveles(_req: Request, res: Response, next: NextFunction) {
    try {
      const lista = await AsignacionesService.listarNivelesActivos();
      res.json(lista);
    } catch (err) {
      next(err);
    }
  }

  static async roles(_req: Request, res: Response, next: NextFunction) {
    try {
      const lista = await AsignacionesService.rolesPermitidos();
      res.json(lista);
    } catch (err) {
      next(err);
    }
  }
}
