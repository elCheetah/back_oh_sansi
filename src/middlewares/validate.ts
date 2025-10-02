// middlewares/validate.ts
import { ZodObject, ZodError } from 'zod';

import { Request, Response, NextFunction } from 'express';

export const validate =
  (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Datos inválidos',
          errores: err.issues.map((e) => ({ campo: e.path.join('.'), detalle: e.message })),

        });
      }
      return res.status(500).json({ message: 'Error de validación' });
    }
  };
