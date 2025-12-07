import prisma from '../config/database';

export interface HistorialDTO {
  rolUsuario: string;
  nombreUsuario: string;
  fechayhora: Date;
  tipodeCambio: string;
  accion: string;
}

export const obtenerHistorialService = async (): Promise<HistorialDTO[]> => {
  const logs = await prisma.logs.findMany({
    where: {
      entidad: {
        not: 'auth', // excluir solo los logs de autenticación
      },
    },
    include: {
      usuario: true,
    },
    orderBy: {
      fecha_cambio: 'desc',
    },
  });

  return logs.map((log) => ({
    rolUsuario: log.usuario.rol, // enum Rol -> se envía como string
    nombreUsuario: [
      log.usuario.nombre,
      log.usuario.primer_apellido,
      log.usuario.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' '),
    fechayhora: log.fecha_cambio,
    tipodeCambio: log.entidad,
    accion: log.motivo ?? '',
  }));
};
