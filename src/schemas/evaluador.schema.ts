// schemas/evaluador.schema.ts
import { z } from 'zod';

export const registroEvaluadorSchema = z
  .object({
    nombre: z.string().min(2, 'Nombre muy corto'),
    ap_paterno: z.string().min(2, 'Apellido paterno requerido'),
    ap_materno: z.string().optional().nullable(),
    correo: z.string().email('Correo inválido').transform((v) => v.toLowerCase().trim()),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe tener al menos una minúscula')
      .regex(/\d/, 'Debe tener al menos un número'),
    confirmPassword: z.string(), // 👈 campo extra
    telefono: z.string().optional().nullable(),
    tipo_documento: z.enum(['CI', 'PASAPORTE', 'CARNET_EXTRANJERO', 'CERTIFICADO_NACIMIENTO']),
    numero_documento: z.string().min(4, 'Documento muy corto'),
    aceptaTerminos: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'], // 👈 el error se asocia al campo confirmPassword
  });

export type RegistroEvaluadorInput = z.infer<typeof registroEvaluadorSchema>;
