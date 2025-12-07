// src/controllers/filtrosController.ts
import { Request, Response } from 'express';
import { obtenerFiltrosCategorias } from '../services/filtrosService';

export const getFiltrosCategorias = async (req: Request, res: Response) => {
  try {
    const { gestion } = req.query;
    const gestionNum = gestion ? parseInt(gestion as string) : new Date().getFullYear();

    const filtros = await obtenerFiltrosCategorias(gestionNum);

    return res.status(200).json({
      success: true,
      data: filtros,
      gestion: gestionNum,
    });
  } catch (error: any) {
    console.error('Error en getFiltrosCategorias:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al cargar filtros',
    });
  }
};