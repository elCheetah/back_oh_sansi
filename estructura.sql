-- CreateEnum
CREATE TYPE "EstadoFase" AS ENUM ('PENDIENTE', 'EN_EJECUCION', 'EN_REVISION', 'FINALIZADA', 'CANCELADA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CI', 'PASAPORTE', 'CARNET_EXTRANJERO', 'CERTIFICADO_NACIMIENTO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'EVALUADOR', 'RESPONSABLE');

-- CreateEnum
CREATE TYPE "RolEquipo" AS ENUM ('LIDER', 'PARTICIPANTE');

-- CreateEnum
CREATE TYPE "EstadoParticipacion" AS ENUM ('CLASIFICADO', 'NO_CLASIFICADO', 'DESCALIFICADO');

-- CreateEnum
CREATE TYPE "TipoParticipacion" AS ENUM ('INDIVIDUAL', 'EQUIPO');

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50),
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveles" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50),
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "niveles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "area_id" INTEGER NOT NULL,
    "nivel_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_medallas" (
    "id" SERIAL NOT NULL,
    "area_id" INTEGER NOT NULL,
    "nivel_id" INTEGER NOT NULL,
    "oros" INTEGER NOT NULL DEFAULT 1,
    "platas" INTEGER NOT NULL DEFAULT 1,
    "bronces" INTEGER NOT NULL DEFAULT 1,
    "menciones" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "config_medallas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fases" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "inicio" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "estado" "EstadoFase" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ap_paterno" VARCHAR(100) NOT NULL,
    "ap_materno" VARCHAR(100),
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20),
    "cargo" VARCHAR(100),
    "profesion" VARCHAR(100),
    "institucion" VARCHAR(150),
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3),
    "rol" "Rol" NOT NULL DEFAULT 'RESPONSABLE',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ap_paterno" VARCHAR(100) NOT NULL,
    "ap_materno" VARCHAR(100),
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "unidad_educativa" VARCHAR(150) NOT NULL,
    "profesion" VARCHAR(150),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olimpistas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ap_paterno" VARCHAR(100) NOT NULL,
    "ap_materno" VARCHAR(100),
    "tipo_documento" "TipoDocumento" NOT NULL,
    "numero_documento" VARCHAR(20) NOT NULL,
    "unidad_educativa" VARCHAR(150) NOT NULL,
    "departamento" VARCHAR(100) NOT NULL,
    "grado" VARCHAR(50),
    "fecha_nacimiento" TIMESTAMP(3),
    "sexo" "Sexo",
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correo" VARCHAR(150) NOT NULL,
    "tutor_id" INTEGER,

    CONSTRAINT "olimpistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembros_equipo" (
    "id" SERIAL NOT NULL,
    "olimpista_id" INTEGER NOT NULL,
    "equipo_id" INTEGER NOT NULL,
    "rol_en_equipo" "RolEquipo" NOT NULL,

    CONSTRAINT "miembros_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion" (
    "id" SERIAL NOT NULL,
    "olimpista_id" INTEGER,
    "equipo_id" INTEGER,
    "area_id" INTEGER NOT NULL,
    "nivel_id" INTEGER NOT NULL,
    "estado" "EstadoParticipacion" NOT NULL DEFAULT 'NO_CLASIFICADO',
    "tipo" "TipoParticipacion" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones" (
    "id" SERIAL NOT NULL,
    "participacion_id" INTEGER NOT NULL,
    "evaluador_id" INTEGER NOT NULL,
    "fase_id" INTEGER NOT NULL,
    "nota" DECIMAL(5,2) NOT NULL,
    "comentario" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "ultima_modificacion" TIMESTAMP(3),

    CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "parametros" JSONB,
    "archivo" VARCHAR(255),
    "generado_por" INTEGER NOT NULL,
    "generado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "entidad" VARCHAR(100) NOT NULL,
    "entidad_id" INTEGER,
    "campo" VARCHAR(100),
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_nombre_key" ON "areas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "areas_codigo_key" ON "areas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "niveles_nombre_key" ON "niveles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "niveles_codigo_key" ON "niveles"("codigo");

-- CreateIndex
CREATE INDEX "asignaciones_usuario_id_idx" ON "asignaciones"("usuario_id");

-- CreateIndex
CREATE INDEX "asignaciones_area_id_nivel_id_idx" ON "asignaciones"("area_id", "nivel_id");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_usuario_id_area_id_nivel_id_key" ON "asignaciones"("usuario_id", "area_id", "nivel_id");

-- CreateIndex
CREATE INDEX "config_medallas_area_id_idx" ON "config_medallas"("area_id");

-- CreateIndex
CREATE INDEX "config_medallas_nivel_id_idx" ON "config_medallas"("nivel_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_medallas_area_id_nivel_id_key" ON "config_medallas"("area_id", "nivel_id");

-- CreateIndex
CREATE UNIQUE INDEX "fases_nombre_key" ON "fases"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tipo_documento_numero_documento_key" ON "usuarios"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "tutores_tipo_documento_numero_documento_key" ON "tutores"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "olimpistas_correo_key" ON "olimpistas"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "olimpistas_tipo_documento_numero_documento_key" ON "olimpistas"("tipo_documento", "numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_nombre_key" ON "equipos"("nombre");

-- CreateIndex
CREATE INDEX "miembros_equipo_olimpista_id_idx" ON "miembros_equipo"("olimpista_id");

-- CreateIndex
CREATE INDEX "miembros_equipo_equipo_id_idx" ON "miembros_equipo"("equipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "miembros_equipo_olimpista_id_equipo_id_key" ON "miembros_equipo"("olimpista_id", "equipo_id");

-- CreateIndex
CREATE INDEX "participacion_olimpista_id_idx" ON "participacion"("olimpista_id");

-- CreateIndex
CREATE INDEX "participacion_equipo_id_idx" ON "participacion"("equipo_id");

-- CreateIndex
CREATE INDEX "participacion_area_id_idx" ON "participacion"("area_id");

-- CreateIndex
CREATE INDEX "participacion_nivel_id_idx" ON "participacion"("nivel_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_olimpista_id_area_id_nivel_id_key" ON "participacion"("olimpista_id", "area_id", "nivel_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_equipo_id_area_id_nivel_id_key" ON "participacion"("equipo_id", "area_id", "nivel_id");

-- CreateIndex
CREATE INDEX "evaluaciones_participacion_id_idx" ON "evaluaciones"("participacion_id");

-- CreateIndex
CREATE INDEX "evaluaciones_evaluador_id_idx" ON "evaluaciones"("evaluador_id");

-- CreateIndex
CREATE INDEX "evaluaciones_fase_id_idx" ON "evaluaciones"("fase_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_participacion_id_evaluador_id_fase_id_key" ON "evaluaciones"("participacion_id", "evaluador_id", "fase_id");

-- CreateIndex
CREATE INDEX "reportes_generado_por_idx" ON "reportes"("generado_por");

-- CreateIndex
CREATE INDEX "logs_usuario_id_idx" ON "logs"("usuario_id");

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "config_medallas" ADD CONSTRAINT "config_medallas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "config_medallas" ADD CONSTRAINT "config_medallas_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "olimpistas" ADD CONSTRAINT "olimpistas_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "miembros_equipo" ADD CONSTRAINT "miembros_equipo_olimpista_id_fkey" FOREIGN KEY ("olimpista_id") REFERENCES "olimpistas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "miembros_equipo" ADD CONSTRAINT "miembros_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_olimpista_id_fkey" FOREIGN KEY ("olimpista_id") REFERENCES "olimpistas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_nivel_id_fkey" FOREIGN KEY ("nivel_id") REFERENCES "niveles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_participacion_id_fkey" FOREIGN KEY ("participacion_id") REFERENCES "participacion"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_evaluador_id_fkey" FOREIGN KEY ("evaluador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "fases"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

