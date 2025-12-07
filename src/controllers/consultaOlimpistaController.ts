// src/controllers/consultaOlimpistaController.ts
import { Request, Response } from 'express';
import { obtenerOlimpistaPorCI } from '../services/consultaOlimpistaService';

export const getOlimpistaPorCI = async (req: Request, res: Response) => {
  try {
    const { ci } = req.params;

    if (!ci || !/^\d+$/.test(ci)) {
      return res.status(400).json({
        success: false,
        message: 'CI inválido',
      });
    }

    const olimpista = await obtenerOlimpistaPorCI(ci);

    if (!olimpista) {
      return res.status(404).json({
        success: false,
        message: 'Olimpista no encontrado o inactivo',
      });
    }

    return res.status(200).json({
      success: true,
      data: olimpista,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al consultar resultados',
    });
  }
};