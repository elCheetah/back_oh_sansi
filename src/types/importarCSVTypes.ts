import { RolEquipo } from '@prisma/client';

export type FilaPlano = Record<string, string>;

export interface MensajeFila {
    fila: number;
    codigo: string;
    campo?: string;
    valor?: string;
    mensaje: string;
}

export interface ResultadoImportacion {
    ok: boolean;
    mensaje_exito: string;
    resumen: {
        filas_procesadas: number;
        insertados_individual: number;
        equipos_inscritos: number;
        miembros_insertados: number;
        filas_descartadas: number;
        equipos_rechazados: number;
        advertencias: number;
    };
    advertencias_por_fila: MensajeFila[];
    errores_por_fila: MensajeFila[];
    equipos_rechazados: { equipo: string; motivo: string }[];
}

export interface MiembroPreparado {
    fila: number;
    olimpistaDocKey: string; // `${tipo}:${numero}`
    datosFila: FilaPlano;
    rol: RolEquipo;
}

export interface GrupoEquipo {
    nombre: string;
    areaId: number;
    nivelId: number;
    miembros: MiembroPreparado[];
    filasOrigen: number[];
}
