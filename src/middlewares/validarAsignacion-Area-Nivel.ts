import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const esquema = z.object({
    usuarioId: z.number().int().positive(),
    areaId: z.number().int().positive(),
    nivelId: z.number().int().positive(),
    rol: z.enum(["RESPONSABLE", "EVALUADOR"]),
    motivo: z.string().max(1000).optional(),
});

export function validarAsignacion(req: Request, res: Response, next: NextFunction) {
    try {
        req.body = esquema.parse({
            ...req.body,
            usuarioId: Number(req.body?.usuarioId),
            areaId: Number(req.body?.areaId),
            nivelId: Number(req.body?.nivelId),
        });
        next();
    } catch (err: any) {
        return res.status(400).json({
            mensaje: "Datos inválidos",
            errores: err?.issues?.map((e: any) => ({ campo: e.path.join("."), detalle: e.message })) ?? [],
        });
    }
}
