// src/middlewares/validarConfigMedallas.ts
import { Request, Response, NextFunction } from "express";

export const validarGuardarConfigMedallas = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    areaId,
    nivelId,
    oros,
    platas,
    bronces,
    menciones,
    notaMinAprobacion,
  } = req.body;

  if (!areaId || !nivelId) {
    return res.status(400).json({
      ok: false,
      mensaje: "Los campos areaId y nivelId son obligatorios.",
    });
  }

  const camposNumericos = [
    { nombre: "oros", valor: oros },
    { nombre: "platas", valor: platas },
    { nombre: "bronces", valor: bronces },
    { nombre: "notaMinAprobacion", valor: notaMinAprobacion },
  ];

  for (const campo of camposNumericos) {
    const num = Number(campo.valor);
    if (!Number.isFinite(num) || num < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `El campo ${campo.nombre} debe ser un número mayor o igual a 0.`,
      });
    }
  }

  if (menciones !== undefined) {
    const numMenciones = Number(menciones);
    if (!Number.isFinite(numMenciones) || numMenciones < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "El campo menciones debe ser un número mayor o igual a 0.",
      });
    }
  }

  next();
};
