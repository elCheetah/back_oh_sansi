import { AnyZodObject, ZodError, ZodTypeAny } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: AnyZodObject | ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          message: "Datos inválidos",
          errores: err.errors.map((e) => ({
            campo: e.path.join("."),
            detalle: e.message,
          })),
        });
      }
      return res.status(500).json({ ok: false, message: "Error de validación" });
    }
  };
