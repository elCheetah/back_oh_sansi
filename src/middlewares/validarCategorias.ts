import { Request, Response, NextFunction } from "express";

export function validarCrearCategoria(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const {
    gestion,
    area_id,
    nivel_id,
    modalidad,
    nota_min_clasificacion,
    oros_final,
    platas_final,
    bronces_final,
    menciones_final,
  } = req.body;

  if (!gestion || isNaN(Number(gestion))) {
    return res.status(400).json({
      ok: false,
      codigo: "GESTION_INVALIDA",
      mensaje: "La gestión es obligatoria y debe ser numérica",
    });
  }

  if (!area_id || isNaN(Number(area_id))) {
    return res.status(400).json({
      ok: false,
      codigo: "AREA_ID_INVALIDO",
      mensaje: "El área es obligatoria",
    });
  }

  if (!nivel_id || isNaN(Number(nivel_id))) {
    return res.status(400).json({
      ok: false,
      codigo: "NIVEL_ID_INVALIDO",
      mensaje: "El nivel es obligatorio",
    });
  }

  if (!modalidad || !["INDIVIDUAL", "GRUPAL"].includes(modalidad)) {
    return res.status(400).json({
      ok: false,
      codigo: "MODALIDAD_INVALIDA",
      mensaje: "La modalidad debe ser INDIVIDUAL o GRUPAL",
    });
  }

  // Normalizo tipos numéricos opcionales
  req.body.gestion = Number(gestion);
  req.body.area_id = Number(area_id);
  req.body.nivel_id = Number(nivel_id);

  if (nota_min_clasificacion !== undefined)
    req.body.nota_min_clasificacion = Number(nota_min_clasificacion);
  if (oros_final !== undefined) req.body.oros_final = Number(oros_final);
  if (platas_final !== undefined) req.body.platas_final = Number(platas_final);
  if (bronces_final !== undefined)
    req.body.bronces_final = Number(bronces_final);
  if (menciones_final !== undefined)
    req.body.menciones_final = Number(menciones_final);

  return next();
}

export function validarAsignarResponsable(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { idCategoria } = req.params;
  const { usuario_id } = req.body;

  if (!idCategoria || isNaN(Number(idCategoria))) {
    return res.status(400).json({
      ok: false,
      codigo: "CATEGORIA_ID_INVALIDO",
      mensaje: "El id de categoría no es válido",
    });
  }

  if (!usuario_id || isNaN(Number(usuario_id))) {
    return res.status(400).json({
      ok: false,
      codigo: "USUARIO_ID_INVALIDO",
      mensaje: "El id de responsable es obligatorio",
    });
  }

  (req as any).idCategoria = Number(idCategoria);
  (req as any).usuarioIdResponsable = Number(usuario_id);

  return next();
}
