import { Request, Response } from "express";
import {
  listarCategoriasMedallero,
  actualizarParametrizacionMedallero,
  UpdateParametrizacionPayload,
} from "../services/parametrizarMedallero.service";

type AuthUser = {
  id: number;
  jti: string;
  rol: "ADMINISTRADOR" | "EVALUADOR" | "RESPONSABLE";
  correo: string;
  nombreCompleto: string;
};

interface AuthRequest extends Request {
  auth?: AuthUser;
}

/**
 * GET /api/parametrizacion-medallas
 * Devuelve todas las categorías con:
 * { idCategoria, area, nivel, oro, plata, bronce, mencion, notaMin }
 */
export async function getParametrizacionMedallero(
  _req: AuthRequest,
  res: Response
) {
  try {
    const data = await listarCategoriasMedallero();
    return res.json({
      ok: true,
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("Error getParametrizacionMedallero:", error);
    return res.status(500).json({
      ok: false,
      message: "Ocurrió un error al obtener la parametrización de medallas.",
    });
  }
}

/**
 * PATCH /api/parametrizacion-medallas/:idCategoria
 * Body: { oro?, plata?, bronce?, mencion?, notaMin? } (solo los que se deseen cambiar)
 */
export async function patchParametrizacionMedallero(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.auth?.id) {
      return res.status(401).json({
        ok: false,
        message: "No autorizado.",
      });
    }

    const idCategoria = Number(req.params.idCategoria);
    if (Number.isNaN(idCategoria) || idCategoria <= 0) {
      return res.status(400).json({
        ok: false,
        message: "El idCategoria es inválido.",
      });
    }

    const {
      oro,
      plata,
      bronce,
      mencion,
      notaMin,
    }: {
      oro?: number;
      plata?: number;
      bronce?: number;
      mencion?: number;
      notaMin?: number;
    } = req.body || {};

    const payload: UpdateParametrizacionPayload = {};

    if (oro !== undefined) {
      if (typeof oro !== "number" || oro < 1 || oro > 100) {
        return res.status(400).json({
          ok: false,
          message: "El campo 'oro' debe ser un número entre 1 y 100.",
        });
      }
      payload.oro = oro;
    }

    if (plata !== undefined) {
      if (typeof plata !== "number" || plata < 1 || plata > 100) {
        return res.status(400).json({
          ok: false,
          message: "El campo 'plata' debe ser un número entre 1 y 100.",
        });
      }
      payload.plata = plata;
    }

    if (bronce !== undefined) {
      if (typeof bronce !== "number" || bronce < 1 || bronce > 100) {
        return res.status(400).json({
          ok: false,
          message: "El campo 'bronce' debe ser un número entre 1 y 100.",
        });
      }
      payload.bronce = bronce;
    }

    if (mencion !== undefined) {
      if (typeof mencion !== "number" || mencion < 0 || mencion > 100) {
        return res.status(400).json({
          ok: false,
          message:
            "El campo 'mencion' debe ser un número entre 0 y 100 (puede ser 0).",
        });
      }
      payload.mencion = mencion;
    }

    if (notaMin !== undefined) {
      if (typeof notaMin !== "number" || notaMin < 1 || notaMin > 100) {
        return res.status(400).json({
          ok: false,
          message: "El campo 'notaMin' debe estar entre 1 y 100.",
        });
      }
      payload.notaMin = notaMin;
    }

    if (
      payload.oro === undefined &&
      payload.plata === undefined &&
      payload.bronce === undefined &&
      payload.mencion === undefined &&
      payload.notaMin === undefined
    ) {
      return res.status(400).json({
        ok: false,
        message: "No se recibió ningún campo para actualizar.",
      });
    }

    const updated = await actualizarParametrizacionMedallero(
      idCategoria,
      payload,
      req.auth.id
    );

    return res.json({
      ok: true,
      message: "Parametrización de medallas actualizada correctamente.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error patchParametrizacionMedallero:", error);

    if (error?.code === "NO_CATEGORIA") {
      return res.status(404).json({
        ok: false,
        message: "La categoría indicada no existe.",
      });
    }

    if (error?.code === "SIN_CAMBIOS") {
      return res.status(400).json({
        ok: false,
        message: "No hay cambios para guardar.",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Ocurrió un error al actualizar la parametrización de medallas.",
    });
  }
}
