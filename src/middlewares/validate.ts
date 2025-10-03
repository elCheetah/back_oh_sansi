// src/middlewares/validate.ts
import { AnyZodObject, ZodError, ZodTypeAny } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate =
  (schema: AnyZodObject | ZodTypeAny) => // 👈 acepta también ZodEffects
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body); // guarda los datos validados en req.body
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Datos inválidos',
          errores: err.errors.map((e) => ({
            campo: e.path.join('.'),
            detalle: e.message,
          })),
        });
      }
      return res.status(500).json({ message: 'Error de validación' });
    }
  };
