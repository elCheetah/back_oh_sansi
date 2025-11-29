// src/types/gestionEvaluador.types.ts

export type GestionEvaluadorDTO = {
  id: number;
  numeroDocumento: string;
  nombreCompleto: string;
  profesion: string | null;
  institucion: string | null;
  habilitado: boolean;
};
