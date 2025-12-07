// src/controllers/clasificadosController.ts
import { Request, Response } from 'express';
import { obtenerClasificados } from '../services/clasificadosService';

export const getClasificados = async (req: Request, res: Response) => {
  try {
    const { area, nivel, gestion } = req.query;

    if (!area || !nivel) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros "area" y "nivel" son obligatorios',
      });
    }

    const gestionNum = gestion ? parseInt(gestion as string) : new Date().getFullYear();

    const resultado = await obtenerClasificados(
      area as string,
      nivel as string,
      gestionNum
    );

    return res.status(200).json({
      success: true,
      data: resultado.data,
      total: resultado.data.length,
      nota_min_clasificacion: resultado.nota_min_clasificacion,
      gestion: gestionNum,
      filtros: { area, nivel },
    });
  } catch (error: any) {
    console.error('Error en getClasificados controller:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener clasificados',
    });
  }
};