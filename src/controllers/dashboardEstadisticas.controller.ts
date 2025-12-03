import { Request, Response } from "express";
import { EstadisticasService } from "../services/dashboardEstadisticas.service";
import NodeCache from "node-cache";

const cache = new NodeCache({ 
  stdTTL: 900,       
  checkperiod: 120, 
  useClones: false    
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
        cached: true 
      });
    }

    console.log("Estadísticas calculadas desde la base de datos");
    const data = await EstadisticasService.getDashboardStats();

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