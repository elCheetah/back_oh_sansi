import { Request, Response, NextFunction } from "express";

export function validarCrearCategoria(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { gestion, area_id, nivel_id, modalidad } = req.body;

  const currentYear = new Date().getFullYear();

  // gestion opcional: si no viene, se usa año actual
  if (
    gestion === undefined ||
    gestion === null ||
    gestion === ""
  ) {
    req.body.gestion = currentYear;
  } else if (isNaN(Number(gestion))) {
    return res.status(400).json({
      ok: false,
      codigo: "GESTION_INVALIDA",
      mensaje: "La gestión debe ser numérica",
    });
  } else {
    req.body.gestion = Number(gestion);
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

  const modalidadUpper = String(modalidad || "").toUpperCase();
  if (!["INDIVIDUAL", "GRUPAL"].includes(modalidadUpper)) {
    return res.status(400).json({
      ok: false,
      codigo: "MODALIDAD_INVALIDA",
      mensaje: "La modalidad debe ser INDIVIDUAL o GRUPAL",
    });
  }

  // Normalizo tipos
  req.body.area_id = Number(area_id);
  req.body.nivel_id = Number(nivel_id);
  req.body.modalidad = modalidadUpper;

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
