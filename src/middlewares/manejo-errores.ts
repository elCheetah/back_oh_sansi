import { Request, Response, NextFunction } from 'express';

export function manejoErrores(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('Error no controlado:', err);
  const status = err?.status || 500;
  res.status(status).json({
    ok: false,
    mensaje: 'Se produjo un error inesperado al procesar la solicitud.',
    detalle: err?.message ?? 'Error interno del servidor',
    pila: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  });
}
