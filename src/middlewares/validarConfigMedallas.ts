// src/middlewares/validarConfigMedallas.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const toInt = (value: unknown) => {
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isNaN(n)) return value;
    return n;
  }
  return value;
};

const actualizarConfigMedallasSchema = z
  .object({
    oros_final: z.preprocess(
      toInt,
      z
        .number({
          required_error: "El número de oros es obligatorio",
          invalid_type_error: "El número de oros debe ser un entero",
        })
        .int()
        .min(0, "El número de oros no puede ser negativo")
        .max(999, "El número de oros no puede ser mayor a 999")
    ),
    platas_final: z.preprocess(
      toInt,
      z
        .number({
          required_error: "El número de platas es obligatorio",
          invalid_type_error: "El número de platas debe ser un entero",
        })
        .int()
        .min(0, "El número de platas no puede ser negativo")
        .max(999, "El número de platas no puede ser mayor a 999")
    ),
    bronces_final: z.preprocess(
      toInt,
      z
        .number({
          required_error: "El número de bronces es obligatorio",
          invalid_type_error: "El número de bronces debe ser un entero",
        })
        .int()
        .min(0, "El número de bronces no puede ser negativo")
        .max(999, "El número de bronces no puede ser mayor a 999")
    ),
    menciones_final: z.preprocess(
      toInt,
      z
        .number({
          invalid_type_error: "El número de menciones debe ser un entero",
        })
        .int()
        .min(0, "El número de menciones no puede ser negativo")
        .max(999, "El número de menciones no puede ser mayor a 999")
        .optional()
    ),
    nota_min_clasificacion: z.preprocess(
      toInt,
      z
        .number({
          required_error: "La nota mínima de aprobación es obligatoria",
          invalid_type_error: "La nota mínima debe ser un entero",
        })
        .int()
        .min(0, "La nota mínima no puede ser menor a 0")
        .max(100, "La nota mínima no puede ser mayor a 100")
    ),
  })
  .refine(
    (data) =>
      (data.oros_final ?? 0) +
        (data.platas_final ?? 0) +
        (data.bronces_final ?? 0) >
      0,
    {
      message: "Debe existir al menos una medalla (oro, plata o bronce)",
      path: ["oros_final"],
    }
  );

export const validarActualizarConfigMedallas = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const categoriaId = Number(req.params.categoriaId);
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    return res.status(400).json({
      ok: false,
      codigo: "ID_CATEGORIA_INVALIDO",
      mensaje: "El identificador de categoría es inválido",
    });
  }

  const parseResult = actualizarConfigMedallasSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errores = parseResult.error.errors.map((e) => ({
      campo: e.path.join("."),
      mensaje: e.message,
    }));

    return res.status(400).json({
      ok: false,
      codigo: "VALIDACION_CONFIG_MEDALLAS",
      errores,
    });
  }

  (req as any).configMedallasInput = parseResult.data;
  (req as any).categoriaId = categoriaId;

  next();
};
