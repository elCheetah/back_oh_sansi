// src/controllers/premiadosController.ts
import { Request, Response } from 'express';
import { obtenerPremiados } from '../services/premiadosService';

export const getPremiados = async (req: Request, res: Response) => {
  try {
    const { area, nivel, gestion } = req.query;

    if (!area || !nivel) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros "area" y "nivel" son obligatorios',
      });
    }

    const gestionNum = gestion ? parseInt(gestion as string) : new Date().getFullYear();

    const resultado = await obtenerPremiados(
      area as string,
      nivel as string,
      gestionNum
    );

    return res.status(200).json({
      success: true,
      data: resultado.data,
      total: resultado.data.length,
      medallero: {
        oros_final: resultado.oros_final,
        platas_final: resultado.platas_final,
        bronces_final: resultado.bronces_final,
        menciones_final: resultado.menciones_final,
      },
      gestion: gestionNum,
      filtros: { area, nivel },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener premiados',
    });
  }
};