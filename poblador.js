// poblador.js
const {
  PrismaClient,
  Rol,
  TipoDocumento,
  Sexo,
  ModalidadCategoria,
  TipoFase,
  EstadoFase,
  EstadoParticipacion,
  RolEquipo,
} = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando poblador...');

  // Limpieza básica (solo para entorno de desarrollo)
  await prisma.evaluaciones.deleteMany();
  await prisma.asignaciones.deleteMany();
  await prisma.participacion.deleteMany();
  await prisma.miembrosEquipo.deleteMany();
  await prisma.equipos.deleteMany();
  await prisma.olimpistas.deleteMany();
  await prisma.tutores.deleteMany();
  await prisma.logs.deleteMany();
  await prisma.reportes.deleteMany();
  await prisma.fases.deleteMany();
  await prisma.usuarios.deleteMany();
  await prisma.categorias.deleteMany();
  await prisma.areas.deleteMany();
  await prisma.niveles.deleteMany();

  // 1) ÁREAS (3)
  const areas = await Promise.all([
    prisma.areas.create({
      data: {
        codigo: 'MAT',
        nombre: 'Matemáticas',
        descripcion: 'Pruebas de razonamiento lógico y matemático.',
      },
    }),
    prisma.areas.create({
      data: {
        codigo: 'FIS',
        nombre: 'Física',
        descripcion: 'Pruebas de mecánica, ondas y electricidad.',
      },
    }),
    prisma.areas.create({
      data: {
        codigo: 'QUI',
        nombre: 'Química',
        descripcion: 'Pruebas de química general y análisis.',
      },
    }),
  ]);

  // 2) NIVELES (3)
  const niveles = await Promise.all([
    prisma.niveles.create({
      data: {
        codigo: 'PRI',
        nombre: 'Primaria',
        descripcion: 'Estudiantes de nivel primario.',
      },
    }),
    prisma.niveles.create({
      data: {
        codigo: 'SEC',
        nombre: 'Secundaria',
        descripcion: 'Estudiantes de nivel secundario.',
      },
    }),
    prisma.niveles.create({
      data: {
        codigo: 'PRE',
        nombre: 'Preuniversitario',
        descripcion: 'Estudiantes de último año o egresados.',
      },
    }),
  ]);

  const gestion = 2025;

  // 3) CATEGORÍAS (9: 3 áreas x 3 niveles; 6 INDIVIDUAL, 3 GRUPAL)
  const categorias = [];
  let countCat = 0;

  for (const area of areas) {
    for (const nivel of niveles) {
      countCat++;
      const modalidad =
        countCat <= 6 ? ModalidadCategoria.INDIVIDUAL : ModalidadCategoria.GRUPAL;

      const cat = await prisma.categorias.create({
        data: {
          gestion,
          area_id: area.id,
          nivel_id: nivel.id,
          modalidad,
          estado: true,
          nota_min_clasificacion: 60,
          oros_final: 3,
          platas_final: 3,
          bronces_final: 3,
          menciones_final: 5,
        },
      });
      categorias.push({ id: cat.id, modalidad: cat.modalidad });
    }
  }

  const categoriasIndividuales = categorias.filter(
    (c) => c.modalidad === ModalidadCategoria.INDIVIDUAL
  );
  const categoriasGrupales = categorias.filter(
    (c) => c.modalidad === ModalidadCategoria.GRUPAL
  );

  // 4) USUARIOS: 1 admin, 1 responsable, 1 evaluador
  const passwordComun = '12345678La#';

  const admin = await prisma.usuarios.create({
    data: {
      contrasena_hash: passwordComun,
      nombre: 'Roberto',
      primer_apellido: 'Gutiérrez',
      segundo_apellido: 'Flores',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000001',
      correo: 'admin@gmail.com',
      telefono: '72000001', // Bolivia
      cargo: 'Administrador General',
      profesion: 'Ingeniero de Sistemas',
      institucion: 'Universidad Mayor de San Andrés',
      rol: Rol.ADMINISTRADOR,
    },
  });

  const responsable = await prisma.usuarios.create({
    data: {
      contrasena_hash: passwordComun,
      nombre: 'Verónica',
      primer_apellido: 'Salinas',
      segundo_apellido: 'Rojas',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000002',
      correo: 'responsable@gmail.com',
      telefono: '72000002',
      cargo: 'Responsable de Áreas',
      profesion: 'Licenciada en Educación',
      institucion: 'Colegio Nacional Bolívar',
      rol: Rol.RESPONSABLE,
    },
  });

  const evaluador = await prisma.usuarios.create({
    data: {
      contrasena_hash: passwordComun,
      nombre: 'Hernán',
      primer_apellido: 'Paredes',
      segundo_apellido: 'López',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000003',
      correo: 'evaluador@gmail.com',
      telefono: '72000003',
      cargo: 'Evaluador',
      profesion: 'Licenciado en Matemáticas',
      institucion: 'Colegio La Salle',
      rol: Rol.EVALUADOR,
    },
  });

  // 5) FASES (2: Clasificatoria y Final)
  const faseClasificatoria = await prisma.fases.create({
    data: {
      nombre: 'Fase Clasificatoria 2025',
      descripcion: 'Primera fase de clasificación.',
      inicio: new Date('2025-07-01T09:00:00Z'),
      fin: new Date('2025-07-05T18:00:00Z'),
      estado: EstadoFase.EN_EJECUCION,
      gestion,
      tipo: TipoFase.CLASIFICATORIA,
      correos_enviados: false,
      resultados_publicados: false,
    },
  });

  const faseFinal = await prisma.fases.create({
    data: {
      nombre: 'Fase Final 2025',
      descripcion: 'Fase final de evaluación.',
      inicio: new Date('2025-08-01T09:00:00Z'),
      fin: new Date('2025-08-05T18:00:00Z'),
      estado: EstadoFase.PENDIENTE,
      gestion,
      tipo: TipoFase.FINAL,
      correos_enviados: false,
      resultados_publicados: false,
    },
  });

  // 6) TUTORES (4)
  const tutores = await Promise.all([
    prisma.tutores.create({
      data: {
        nombre: 'Luis',
        primer_apellido: 'Mendoza',
        segundo_apellido: 'Quispe',
        tipo_documento: TipoDocumento.CI,
        numero_documento: '7000001',
        telefono: '72010001',
        correo: 'luis.mendoza@gmail.com',
        unidad_educativa: 'Colegio Don Bosco',
        profesion: 'Profesor de Matemáticas',
      },
    }),
    prisma.tutores.create({
      data: {
        nombre: 'Ana',
        primer_apellido: 'Salazar',
        segundo_apellido: 'Vargas',
        tipo_documento: TipoDocumento.CI,
        numero_documento: '7000002',
        telefono: '72010002',
        correo: 'ana.salazar@gmail.com',
        unidad_educativa: 'Colegio Santa María',
        profesion: 'Profesora de Física',
      },
    }),
    prisma.tutores.create({
      data: {
        nombre: 'Diego',
        primer_apellido: 'Rivero',
        segundo_apellido: 'Flores',
        tipo_documento: TipoDocumento.CI,
        numero_documento: '7000003',
        telefono: '72010003',
        correo: 'diego.rivero@gmail.com',
        unidad_educativa: 'Colegio San Martín',
        profesion: 'Profesor de Química',
      },
    }),
    prisma.tutores.create({
      data: {
        nombre: 'Patricia',
        primer_apellido: 'Gómez',
        segundo_apellido: 'Arce',
        tipo_documento: TipoDocumento.CI,
        numero_documento: '7000004',
        telefono: '72010004',
        correo: 'patricia.gomez@gmail.com',
        unidad_educativa: 'Colegio Alemán',
        profesion: 'Profesora de Ciencias',
      },
    }),
  ]);

  // 7) OLIMPISTAS (40)
  const olimpistas = [];

  const nombresBase = [
    'Juan', 'Andrea', 'Miguel', 'Lucía', 'Fernando',
    'Sofía', 'Ricardo', 'Valeria', 'Carlos', 'Gabriela',
    'Rodrigo', 'Paola', 'Mauricio', 'Camila', 'Javier',
    'Carla', 'Hernán', 'Daniela', 'Sergio', 'Mónica',
    'Bruno', 'Alejandra', 'Marco', 'Nadia', 'Pablo',
    'Rocío', 'Óscar', 'Elena', 'Raúl', 'Mariela',
    'Hugo', 'Fiorella', 'Nicolás', 'Bárbara', 'Cristian',
    'Yesenia', 'Iván', 'Patricia', 'Gustavo',
  ];

  const apellidos1 = [
    'Pérez', 'López', 'Fernández', 'García', 'Rodríguez',
    'Rojas', 'Mamani', 'Quispe', 'Flores', 'Vargas',
  ];
  const apellidos2 = [
    'Gonzales', 'Torrez', 'Soria', 'Medina', 'Aguilar',
    'Huanca', 'Salinas', 'Arce', 'Ruiz', 'Campos',
  ];

  const departamentos = [
    'La Paz',
    'Cochabamba',
    'Santa Cruz',
    'Oruro',
    'Potosí',
    'Chuquisaca',
    'Tarija',
    'Beni',
    'Pando',
  ];

  for (let i = 0; i < 40; i++) {
    const nombre = nombresBase[i] || `Estudiante${i + 1}`;
    const tutor = tutores[i % tutores.length];
    const docNum = String(8000000 + i);
    const correo = `${nombre.toLowerCase()}.${i + 1}@gmail.com`.replace(/ /g, '');
    const apellido1 = apellidos1[i % apellidos1.length];
    const apellido2 = apellidos2[i % apellidos2.length];
    const depto = departamentos[i % departamentos.length];

    const ol = await prisma.olimpistas.create({
      data: {
        nombre,
        primer_apellido: apellido1,
        segundo_apellido: apellido2,
        tipo_documento: TipoDocumento.CI,
        numero_documento: docNum,
        unidad_educativa: 'Unidad Educativa Bolivia',
        departamento: depto,
        grado: i < 10 ? '6to de Secundaria' : '5to de Secundaria',
        fecha_nacimiento: new Date(`200${i % 10}-0${(i % 9) + 1}-15`),
        sexo: i % 2 === 0 ? Sexo.MASCULINO : Sexo.FEMENINO,
        estado: true,
        correo,
        tutor_id: tutor.id,
      },
    });

    olimpistas.push({ id: ol.id });
  }

  // 8) EQUIPOS (10 equipos de 3 integrantes) usando olimpistas[10..39]
  const equipos = [];
  let idxOlimpista = 10; // desde el olimpista 11 para equipos

  for (let i = 0; i < 10; i++) {
    const equipo = await prisma.equipos.create({
      data: {
        nombre: `Equipo-${i + 1}`,
      },
    });
    equipos.push({ id: equipo.id });

    for (let j = 0; j < 3; j++) {
      const olId = olimpistas[idxOlimpista].id;
      await prisma.miembrosEquipo.create({
        data: {
          olimpista_id: olId,
          equipo_id: equipo.id,
          rol_en_equipo: j === 0 ? RolEquipo.LIDER : RolEquipo.PARTICIPANTE,
        },
      });
      idxOlimpista++;
    }
  }

  // 9) PARTICIPACIONES
  const participaciones = [];

  // 9.1) 10 individuales en categorías INDIVIDUAL
  for (let i = 0; i < 10; i++) {
    const ol = olimpistas[i];
    const cat = categoriasIndividuales[i % categoriasIndividuales.length];

    const part = await prisma.participacion.create({
      data: {
        categoria_id: cat.id,
        olimpista_id: ol.id,
        estado: EstadoParticipacion.NO_CLASIFICADO,
      },
    });
    participaciones.push({ id: part.id });
  }

  // 9.2) 10 grupales en categorías GRUPAL
  for (let i = 0; i < 10; i++) {
    const eq = equipos[i];
    const cat = categoriasGrupales[i % categoriasGrupales.length];

    const part = await prisma.participacion.create({
      data: {
        categoria_id: cat.id,
        equipo_id: eq.id,
        estado: EstadoParticipacion.NO_CLASIFICADO,
      },
    });
    participaciones.push({ id: part.id });
  }

  // 10) ASIGNACIONES Usuario ↔ Categoría
  // RESPONSABLE en todas las categorías
  for (const cat of categorias) {
    await prisma.asignaciones.create({
      data: {
        usuario_id: responsable.id,
        categoria_id: cat.id,
        estado: true,
      },
    });
  }

  // EVALUADOR en 5 categorías
  for (let i = 0; i < 5; i++) {
    const cat = categorias[i];
    await prisma.asignaciones.create({
      data: {
        usuario_id: evaluador.id,
        categoria_id: cat.id,
        estado: true,
      },
    });
  }

  // 11) EVALUACIONES para ambas fases (notas 1–100)
  function pseudoRandomNota(base) {
    return ((base * 37) % 100) + 1; // 1..100
  }

  let baseCounter = 1;
  for (const part of participaciones) {
    // Clasificatoria
    const notaClasif = pseudoRandomNota(baseCounter);
    await prisma.evaluaciones.create({
      data: {
        participacion_id: part.id,
        evaluador_id: evaluador.id,
        fase_id: faseClasificatoria.id,
        nota: notaClasif,
        comentario:
          notaClasif >= 60
            ? 'Buen desempeño en la fase clasificatoria.'
            : 'Debe reforzar algunos temas.',
        validado: baseCounter % 2 === 0,
      },
    });

    // Final
    const notaFinal = pseudoRandomNota(baseCounter + 10);
    await prisma.evaluaciones.create({
      data: {
        participacion_id: part.id,
        evaluador_id: evaluador.id,
        fase_id: faseFinal.id,
        nota: notaFinal,
        comentario:
          notaFinal >= 60
            ? 'Buen desempeño en la fase final.'
            : 'No alcanzó el puntaje esperado.',
        validado: baseCounter % 3 === 0,
      },
    });

    baseCounter++;
  }

  console.log('✅ Poblador ejecutado correctamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en poblador:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
