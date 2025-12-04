import { Request, Response } from "express";
import { EvaluacionIndividualService } from "../services/evaluacionIndividual.service";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutos de caché

export const getAssignedOlympians = async (req: Request, res: Response) => {
    try {
        const user = req.auth;

        if (!user || user.rol !== "EVALUADOR") {
            return res.status(403).json({
                success: false,
                message: "Acceso denegado. Solo para evaluadores.",
            });
        }

        const cacheKey = `assigned_olympians_${user.id}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true
            });
        }

        const data = await EvaluacionIndividualService.getAssignedOlympians(user.id);
        cache.set(cacheKey, data);

        return res.json({
            success: true,
            data,
            cached: false
        });
    } catch (error) {
        console.error("Error al obtener olimpistas asignados:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al obtener asignaciones",
        });
    }
};
