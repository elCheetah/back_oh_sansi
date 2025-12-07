import { Request, Response } from 'express';
import { obtenerHistorialService } from '../services/historial.service';

export const obtenerHistorialController = async (req: Request, res: Response) => {
  try {
    const historial = await obtenerHistorialService();

    return res.status(200).json({
      ok: true,
      historial,
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);

    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el historial de cambios',
    });
  }
};
