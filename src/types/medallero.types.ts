export type FiltroMedallero = {
  area_id?: number | string;
  nivel_id?: number | string;
  modalidad?: "INDIVIDUAL" | "EQUIPO";
  search?: string;
};

export type GanadorItem = {
  participacion_id: number;
  posicion: number;
  area_id: number;
  area: string;
  nivel_id: number;
  nivel: string;
  modalidad: "INDIVIDUAL" | "EQUIPO";
  nombre: string;
  ci: string | null;
  unidadEducativa: string | null;
  nota: number;
  distincion: "Medalla de Oro" | "Medalla de Plata" | "Medalla de Bronce" | "Mención" | null;
};

export type GrupoResumen = {
  area_id: number;
  area: string;
  nivel_id: number;
  nivel: string;
  modalidad: "INDIVIDUAL" | "EQUIPO";
  oros: number;
  platas: number;
  bronces: number;
  menciones: number;
};

export type SnapshotMedallero = {
  publicados_en: string;          // ISO
  fase_final_id: number;
  grupos: {
    clave: string;                // `${area_id}__${nivel_id}__${modalidad}`
    ganadores: GanadorItem[];
    resumen: GrupoResumen;
  }[];
};
