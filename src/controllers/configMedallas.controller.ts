// src/controllers/configMedallas.controller.ts
import { Request, Response } from "express";
import {
  listarConfigMedallasSrv,
  actualizarConfigMedallasSrv,
} from "../services/configMedallas.service";

export const listarConfigMedallasCtrl = async (req: Request, res: Response) => {
  try {
    const gestionQuery = req.query.gestion as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const modalidad = req.query
      .modalidad as "INDIVIDUAL" | "GRUPAL" | undefined;

    const gestion =
      gestionQuery && !Number.isNaN(Number(gestionQuery))
        ? Number(gestionQuery)
        : new Date().getFullYear();

    const { total, items } = await listarConfigMedallasSrv({
      gestion,
      search,
      modalidad,
    });

    return res.json({
      ok: true,
      gestion,
      total,
      categorias: items,
    });
  } catch (error) {
    console.error("Error al listar configuración de medallas:", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_LISTAR_CONFIG_MEDALLAS",
      mensaje: "Ocurrió un error al obtener la configuración de medallas",
    });
  }
};

export const actualizarConfigMedallasCtrl = async (
  req: Request,
  res: Response
) => {
  try {
    const categoriaId = (req as any).categoriaId as number;
    const input = (req as any).configMedallasInput as {
      oros_final: number;
      platas_final: number;
      bronces_final: number;
      menciones_final?: number;
      nota_min_clasificacion: number;
    };

    const usuario = (req as any).usuario;
    const usuarioId = usuario?.id ?? null;

    const actualizado = await actualizarConfigMedallasSrv(
      categoriaId,
      input,
      usuarioId
    );

    return res.json({
      ok: true,
      mensaje: "Configuración de medallas actualizada correctamente",
      categoria: actualizado,
    });
  } catch (error: any) {
    console.error("Error al actualizar configuración de medallas:", error);

    if (error.codigo === "CATEGORIA_NO_ENCONTRADA") {
      return res.status(404).json({
        ok: false,
        codigo: error.codigo,
        mensaje: "La categoría no existe o está inactiva",
      });
    }

    if (error.codigo === "CATEGORIA_INACTIVA") {
      return res.status(400).json({
        ok: false,
        codigo: error.codigo,
        mensaje:
          "No se puede modificar una categoría, área o nivel inactivos para la gestión indicada",
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ACTUALIZAR_CONFIG_MEDALLAS",
      mensaje: "Ocurrió un error al actualizar la configuración de medallas",
    });
  }
};
