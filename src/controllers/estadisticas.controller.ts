// src/controllers/estadisticas.controller.ts
import { Request, Response } from "express";
import { EstadisticasService } from "../services/estadisticas.service";
import NodeCache from "node-cache";

// Cache global: 15 minutos = 900 segundos
const cache = new NodeCache({ 
  stdTTL: 900,        // 15 minutos por defecto
  checkperiod: 120,   // Revisar cada 2 minutos por claves expiradas
  useClones: false    // Mejor rendimiento
});

const CACHE_KEY = "dashboard_stats_all";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // 1. Intentar obtener del caché
    const cachedData = cache.get(CACHE_KEY);

    if (cachedData) {
      console.log("Estadísticas servidas desde caché");
      return res.json({ 
        success: true, 
        data: cachedData,
        cached: true  // opcional: para que el frontend sepa que es caché
      });
    }

    // 2. Si no está en caché → obtener de la BD
    console.log("Estadísticas calculadas desde la base de datos");
    const data = await EstadisticasService.getDashboardStats();

    // 3. Guardar en caché por 15 minutos
    cache.set(CACHE_KEY, data);

    return res.json({ 
      success: true, 
      data 
    });

  } catch (error) {
    console.error("Error en getDashboardStats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener estadísticas" 
    });
  }
};