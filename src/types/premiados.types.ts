// src/types/premiados.types.ts
export type FiltroPremiados = {
  area_id?: number | string;
  nivel_id?: number | string;
  modalidad?: "INDIVIDUAL" | "EQUIPO";
  search?: string;
  page?: number | string;
  pageSize?: number | string;
};

export type ItemPremiado = {
  id: number;                     // id de Participacion
  posicion: number;               // ranking
  nombreCompleto: string;
  ci?: string | null;             // cuando es Individual
  equipo?: string | null;         // cuando es Equipo
  unidadEducativa?: string | null;
  area: string;
  nivel: string;
  modalidad: "INDIVIDUAL" | "EQUIPO";
  estado: "CLASIFICADO" | "NO_CLASIFICADO" | "DESCALIFICADO";
  nota: number;                   // promedio final
  distincion: string | null;      // "Medalla de oro|plata|bronce|Mención" o null
  certificado?: string | null;    // placeholder si luego lo adjuntas
};

export type PremiadosResponse = {
  ok: true;
  total: number;
  page: number;
  pageSize: number;
  data: ItemPremiado[];
};
