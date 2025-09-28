import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const mensaje = err.mensaje || err.message || 'Error interno';
  res.status(status).json({
    ok: false,
    mensaje,
    detalle: process.env.NODE_ENV === 'development' ? String(err.stack || err) : undefined
  });
}
