// types/evaluador.types.ts
export interface RegistroEvaluadorDTO {
  nombre: string;
  ap_paterno: string;
  ap_materno?: string | null;
  correo: string;
  password: string;
  telefono?: string | null;
  tipo_documento: 'CI' | 'PASAPORTE' | 'CARNET_EXTRANJERO' | 'CERTIFICADO_NACIMIENTO';
  numero_documento: string;
  aceptaTerminos: boolean;
}
