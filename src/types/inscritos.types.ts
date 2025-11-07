export type InscritoDTO = {
  idParticipacion: number;
  modalidad: 'INDIVIDUAL' | 'EQUIPO';
  estado: 'CLASIFICADO' | 'NO_CLASIFICADO' | 'DESCALIFICADO';
  area: { id: number; nombre: string };
  nivel: { id: number; nombre: string };
  olimpista?: {
    id: number;
    nombreCompleto: string;
    ci: string;
    unidadEducativa: string;
    departamento: string;
  };
  tutorLegal?: { id: number; nombreCompleto: string } | null;
  equipo?: { id: number; nombre: string } | null;
};
