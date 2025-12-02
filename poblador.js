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

  // 0) LIMPIEZA (orden respetando FK)
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
  await prisma.areas.createMany({
    data: [
      {
        codigo: 'MAT',
        nombre: 'Matemáticas',
        descripcion: 'Pruebas de razonamiento lógico y matemático.',
      },
      {
        codigo: 'FIS',
        nombre: 'Física',
        descripcion: 'Pruebas de mecánica, ondas y electricidad.',
      },
      {
        codigo: 'QUI',
        nombre: 'Química',
        descripcion: 'Pruebas de química general y análisis.',
      },
    ],
  });

  const areasDB = await prisma.areas.findMany({ orderBy: { id: 'asc' } });

  // 2) NIVELES (3)
  await prisma.niveles.createMany({
    data: [
      {
        codigo: 'PRI',
        nombre: 'Primaria',
        descripcion: 'Estudiantes de nivel primario.',
      },
      {
        codigo: 'SEC',
        nombre: 'Secundaria',
        descripcion: 'Estudiantes de nivel secundario.',
      },
      {
        codigo: 'PRE',
        nombre: 'Preuniversitario',
        descripcion: 'Estudiantes de último año o egresados.',
      },
    ],
  });

  const nivelesDB = await prisma.niveles.findMany({ orderBy: { id: 'asc' } });

  const gestion = 2025;

  // 3) CATEGORÍAS (9: 3 áreas x 3 niveles; 6 INDIVIDUAL, 3 GRUPAL)
  const categoriasInsert = [];
  let countCat = 0;

  for (const area of areasDB) {
    for (const nivel of nivelesDB) {
      countCat++;
      const modalidad =
        countCat <= 6
          ? ModalidadCategoria.INDIVIDUAL
          : ModalidadCategoria.GRUPAL;

      categoriasInsert.push({
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
      });
    }
  }

  await prisma.categorias.createMany({ data: categoriasInsert });
  const categoriasDB = await prisma.categorias.findMany({
    orderBy: { id: 'asc' },
  });

  const categoriasIndividuales = categoriasDB.filter(
    (c) => c.modalidad === ModalidadCategoria.INDIVIDUAL
  );
  const categoriasGrupales = categoriasDB.filter(
    (c) => c.modalidad === ModalidadCategoria.GRUPAL
  );

  // 4) USUARIOS: admins, responsables, evaluadores
  const passwordComun = '12345678La#'; // OJO: en producción iría hasheado

  const adminsData = [
    {
      contrasena_hash: passwordComun,
      nombre: 'Marcelo',
      primer_apellido: 'Antezana',
      segundo_apellido: 'Camacho',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000001',
      correo: 'admin@gmail.com',
      telefono: '72000001',
      cargo: 'Administrador General',
      profesion: 'Ingeniero de Sistemas',
      institucion: 'Universidad Mayor de San Simón',
      rol: Rol.ADMINISTRADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Roberto',
      primer_apellido: 'Gutiérrez',
      segundo_apellido: 'Flores',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000002',
      correo: 'admin1@gmail.com',
      telefono: '72000002',
      cargo: 'Administrador de Plataforma',
      profesion: 'Ingeniero Informático',
      institucion: 'Universidad Católica Boliviana',
      rol: Rol.ADMINISTRADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Carla',
      primer_apellido: 'Rojas',
      segundo_apellido: 'Mamani',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000003',
      correo: 'admin2@gmail.com',
      telefono: '72000003',
      cargo: 'Administradora Académica',
      profesion: 'Licenciada en Educación',
      institucion: 'Universidad Mayor de San Andrés',
      rol: Rol.ADMINISTRADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Javier',
      primer_apellido: 'Fernández',
      segundo_apellido: 'Quispe',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000004',
      correo: 'admin3@gmail.com',
      telefono: '72000004',
      cargo: 'Administrador de Sistemas',
      profesion: 'Ingeniero de Sistemas',
      institucion: 'Universidad Privada Boliviana',
      rol: Rol.ADMINISTRADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Lucía',
      primer_apellido: 'García',
      segundo_apellido: 'Vargas',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000005',
      correo: 'admin4@gmail.com',
      telefono: '72000005',
      cargo: 'Coordinadora Administrativa',
      profesion: 'Administradora de Empresas',
      institucion: 'Universidad Mayor de San Simón',
      rol: Rol.ADMINISTRADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Sergio',
      primer_apellido: 'Paredes',
      segundo_apellido: 'Salinas',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9000006',
      correo: 'admin5@gmail.com',
      telefono: '72000006',
      cargo: 'Administrador de Eventos',
      profesion: 'Licenciado en Economía',
      institucion: 'Universidad Mayor de San Andrés',
      rol: Rol.ADMINISTRADOR,
    },
  ];

  const responsablesData = [
    {
      contrasena_hash: passwordComun,
      nombre: 'Verónica',
      primer_apellido: 'Salinas',
      segundo_apellido: 'Rojas',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100001',
      correo: 'responsable@gmail.com',
      telefono: '72000011',
      cargo: 'Responsable General',
      profesion: 'Licenciada en Educación',
      institucion: 'Colegio Nacional Bolívar',
      rol: Rol.RESPONSABLE,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Luis',
      primer_apellido: 'Mendoza',
      segundo_apellido: 'Quispe',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100002',
      correo: 'responsable1@gmail.com',
      telefono: '72000012',
      cargo: 'Responsable de Matemáticas',
      profesion: 'Profesor de Matemáticas',
      institucion: 'Colegio Don Bosco',
      rol: Rol.RESPONSABLE,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Ana',
      primer_apellido: 'Salazar',
      segundo_apellido: 'Vargas',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100003',
      correo: 'responsable2@gmail.com',
      telefono: '72000013',
      cargo: 'Responsable de Física',
      profesion: 'Profesora de Física',
      institucion: 'Colegio Santa María',
      rol: Rol.RESPONSABLE,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Diego',
      primer_apellido: 'Rivero',
      segundo_apellido: 'Flores',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100004',
      correo: 'responsable3@gmail.com',
      telefono: '72000014',
      cargo: 'Responsable de Química',
      profesion: 'Profesor de Química',
      institucion: 'Colegio San Martín',
      rol: Rol.RESPONSABLE,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Patricia',
      primer_apellido: 'Gómez',
      segundo_apellido: 'Arce',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100005',
      correo: 'responsable4@gmail.com',
      telefono: '72000015',
      cargo: 'Responsable de Área Científica',
      profesion: 'Profesora de Ciencias',
      institucion: 'Colegio Alemán',
      rol: Rol.RESPONSABLE,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Marco',
      primer_apellido: 'López',
      segundo_apellido: 'Huanca',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9100006',
      correo: 'responsable5@gmail.com',
      telefono: '72000016',
      cargo: 'Responsable de Logística',
      profesion: 'Administrador',
      institucion: 'Gobierno Autónomo Municipal',
      rol: Rol.RESPONSABLE,
    },
  ];

  const evaluadoresData = [
    {
      contrasena_hash: passwordComun,
      nombre: 'Hernán',
      primer_apellido: 'Paredes',
      segundo_apellido: 'López',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200001',
      correo: 'evaluador@gmail.com',
      telefono: '72000021',
      cargo: 'Evaluador',
      profesion: 'Licenciado en Matemáticas',
      institucion: 'Colegio La Salle',
      rol: Rol.EVALUADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Gabriela',
      primer_apellido: 'Rivas',
      segundo_apellido: 'Torrez',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200002',
      correo: 'evaluador1@gmail.com',
      telefono: '72000022',
      cargo: 'Evaluadora',
      profesion: 'Licenciada en Física',
      institucion: 'Colegio San Agustín',
      rol: Rol.EVALUADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Ricardo',
      primer_apellido: 'Aguilar',
      segundo_apellido: 'Mamani',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200003',
      correo: 'evaluador2@gmail.com',
      telefono: '72000023',
      cargo: 'Evaluador',
      profesion: 'Ingeniero Químico',
      institucion: 'Universidad Mayor de San Andrés',
      rol: Rol.EVALUADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Valeria',
      primer_apellido: 'Campos',
      segundo_apellido: 'Ruiz',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200004',
      correo: 'evaluador3@gmail.com',
      telefono: '72000024',
      cargo: 'Evaluadora',
      profesion: 'Licenciada en Estadística',
      institucion: 'Universidad Mayor de San Simón',
      rol: Rol.EVALUADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Pablo',
      primer_apellido: 'Medina',
      segundo_apellido: 'Soria',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200005',
      correo: 'evaluador4@gmail.com',
      telefono: '72000025',
      cargo: 'Evaluador',
      profesion: 'Ingeniero Industrial',
      institucion: 'Universidad Privada Boliviana',
      rol: Rol.EVALUADOR,
    },
    {
      contrasena_hash: passwordComun,
      nombre: 'Rocío',
      primer_apellido: 'Huanca',
      segundo_apellido: 'Gonzales',
      tipo_documento: TipoDocumento.CI,
      numero_documento: '9200006',
      correo: 'evaluador5@gmail.com',
      telefono: '72000026',
      cargo: 'Evaluadora',
      profesion: 'Licenciada en Física',
      institucion: 'Universidad Mayor de San Andrés',
      rol: Rol.EVALUADOR,
    },
  ];

  await prisma.usuarios.createMany({
    data: [...adminsData, ...responsablesData, ...evaluadoresData],
  });

  const usuariosDB = await prisma.usuarios.findMany({ orderBy: { id: 'asc' } });
  const responsables = usuariosDB.filter((u) => u.rol === Rol.RESPONSABLE);
  const evaluadores = usuariosDB.filter((u) => u.rol === Rol.EVALUADOR);

  const responsablePrincipal = usuariosDB.find(
    (u) => u.correo === 'responsable@gmail.com'
  );
  const evaluadorPrincipal = usuariosDB.find(
    (u) => u.correo === 'evaluador@gmail.com'
  );

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
  await prisma.tutores.createMany({
    data: [
      {
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
      {
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
      {
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
      {
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
    ],
  });

  const tutoresDB = await prisma.tutores.findMany({ orderBy: { id: 'asc' } });

  // 7) OLIMPISTAS (40: 10 individuales + 30 para equipos)
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

  const olimpistasData = [];
  for (let i = 0; i < 40; i++) {
    const nombre = nombresBase[i] || `Estudiante${i + 1}`;
    const tutor = tutoresDB[i % tutoresDB.length];
    const docNum = String(8000000 + i);
    const correo = `${nombre.toLowerCase()}.${i + 1}@gmail.com`.replace(/ /g, '');
    const apellido1 = apellidos1[i % apellidos1.length];
    const apellido2 = apellidos2[i % apellidos2.length];
    const depto = departamentos[i % departamentos.length];

    olimpistasData.push({
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
    });
  }

  await prisma.olimpistas.createMany({ data: olimpistasData });
  const olimpistasDB = await prisma.olimpistas.findMany({
    orderBy: { id: 'asc' },
  });

  // 8) EQUIPOS (10 equipos de 3 integrantes) usando olimpistas[10..39]
  const equiposInsert = [];
  for (let i = 0; i < 10; i++) {
    equiposInsert.push({ nombre: `Equipo-${i + 1}` });
  }
  await prisma.equipos.createMany({ data: equiposInsert });
  const equiposDB = await prisma.equipos.findMany({ orderBy: { id: 'asc' } });

  const miembrosInsert = [];
  let idxOlimpista = 10; // desde el olimpista 11 para equipos

  for (let i = 0; i < 10; i++) {
    const equipo = equiposDB[i];
    for (let j = 0; j < 3; j++) {
      const ol = olimpistasDB[idxOlimpista];
      miembrosInsert.push({
        olimpista_id: ol.id,
        equipo_id: equipo.id,
        rol_en_equipo: j === 0 ? RolEquipo.LIDER : RolEquipo.PARTICIPANTE,
      });
      idxOlimpista++;
    }
  }

  await prisma.miembrosEquipo.createMany({ data: miembrosInsert });

  // 9) PARTICIPACIONES (10 individuales + 10 grupales)
  const participacionesInsert = [];

  // 9.1) 10 individuales en categorías INDIVIDUAL
  for (let i = 0; i < 10; i++) {
    const ol = olimpistasDB[i];
    const cat = categoriasIndividuales[i % categoriasIndividuales.length];
    participacionesInsert.push({
      categoria_id: cat.id,
      olimpista_id: ol.id,
      equipo_id: null,
      estado: EstadoParticipacion.NO_CLASIFICADO,
    });
  }

  // 9.2) 10 grupales en categorías GRUPAL
  for (let i = 0; i < 10; i++) {
    const eq = equiposDB[i];
    const cat = categoriasGrupales[i % categoriasGrupales.length];
    participacionesInsert.push({
      categoria_id: cat.id,
      olimpista_id: null,
      equipo_id: eq.id,
      estado: EstadoParticipacion.NO_CLASIFICADO,
    });
  }

  await prisma.participacion.createMany({ data: participacionesInsert });
  const participacionesDB = await prisma.participacion.findMany({
    orderBy: { id: 'asc' },
  });

  // 🔟 ASIGNACIONES Usuario ↔ Categoría con rangos (indice_inicio / indice_fin)
  const asignacionesInsert = [];
  const responsablePrincipalId = responsablePrincipal?.id || responsables[0].id;

  for (const cat of categoriasDB) {
    const partsCat = participacionesDB.filter(
      (p) => p.categoria_id === cat.id
    );
    const total = partsCat.length;

    // RESPONSABLE principal: ve todo el rango de la categoría
    asignacionesInsert.push({
      usuario_id: responsablePrincipalId,
      categoria_id: cat.id,
      indice_inicio: total > 0 ? 1 : null,
      indice_fin: total > 0 ? total : null,
      estado: true,
      creado_en: new Date(),
    });

    // Evaluadores: repartir el rango entre los primeros 3 evaluadores
    const numEvals = Math.min(3, evaluadores.length);
    if (total > 0 && numEvals > 0) {
      const baseSize = Math.floor(total / numEvals);
      let remainder = total % numEvals;
      let currentStart = 1;

      for (let i = 0; i < numEvals; i++) {
        const size = baseSize + (remainder > 0 ? 1 : 0);
        if (size === 0) break;

        const start = currentStart;
        const end = currentStart + size - 1;

        asignacionesInsert.push({
          usuario_id: evaluadores[i].id,
          categoria_id: cat.id,
          indice_inicio: start,
          indice_fin: end,
          estado: true,
          creado_en: new Date(),
        });

        currentStart = end + 1;
        if (remainder > 0) remainder--;
      }
    }
  }

  await prisma.asignaciones.createMany({ data: asignacionesInsert });

  // 11) EVALUACIONES para ambas fases (notas 1–100)
  function pseudoRandomNota(base) {
    return ((base * 37) % 100) + 1; // 1..100
  }

  const evalInsert = [];
  let baseCounter = 1;

  for (const part of participacionesDB) {
    const evalUser =
      evaluadores[(baseCounter - 1) % evaluadores.length] || evaluadorPrincipal;

    const notaClasif = pseudoRandomNota(baseCounter);
    evalInsert.push({
      participacion_id: part.id,
      evaluador_id: evalUser.id,
      fase_id: faseClasificatoria.id,
      nota: notaClasif,
      comentario:
        notaClasif >= 60
          ? 'Buen desempeño en la fase clasificatoria.'
          : 'Debe reforzar algunos temas.',
      validado: baseCounter % 2 === 0,
      creado_en: new Date(),
    });

    const notaFinal = pseudoRandomNota(baseCounter + 10);
    evalInsert.push({
      participacion_id: part.id,
      evaluador_id: evalUser.id,
      fase_id: faseFinal.id,
      nota: notaFinal,
      comentario:
        notaFinal >= 60
          ? 'Buen desempeño en la fase final.'
          : 'No alcanzó el puntaje esperado.',
      validado: baseCounter % 3 === 0,
      creado_en: new Date(),
    });

    baseCounter++;
  }

  await prisma.evaluaciones.createMany({ data: evalInsert });

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
