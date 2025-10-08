import { Request, Response, NextFunction } from "express";

export function actorRequerido(req: Request, res: Response, next: NextFunction) {
    const raw = req.header("x-usuario-id");
    const actorId = raw ? Number(raw) : NaN;

    if (!raw || Number.isNaN(actorId) || actorId <= 0) {
        return res.status(401).json({
            mensaje: "No autorizado",
            detalle: "Debe enviar el encabezado 'x-usuario-id' con un id de usuario válido.",
        });
    }

    (req as any).actorId = actorId;
    next();
}
