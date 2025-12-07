import { TipoDocumento } from "@prisma/client";

export interface RegistroEvaluadorDTO {
  nombre: string;
  ap_paterno: string;
  ap_materno?: string | null;
  correo: string;
  password: string;
  confirmPassword: string;
  telefono?: string | null;
  tipo_documento: TipoDocumento; // CI | PASAPORTE | CARNET_EXTRANJERO
  numero_documento: string;
  aceptaTerminos: boolean;

  profesion?: string | null;
  institucion?: string | null;
  cargo?: string | null;
}
