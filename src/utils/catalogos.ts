import prisma from './../config/database';
import { ModalidadCategoria } from '@prisma/client';

export type Catalogos = {
  areasPorNombre: Map<string, { id: number }>;
  nivelesPorNombre: Map<string, { id: number }>;
  categoriasPorClave: Map<
    string,
    { id: number; gestion: number; modalidad: ModalidadCategoria; areaId: number; nivelId: number }
  >;
};

let cacheCatalogos: Catalogos | null = null;
let ultimaActualizacion = 0;
let cargando = false;
let promesaCompartida: Promise<Catalogos> | null = null;

const CACHE_TTL = 10 * 60 * 1000;

export async function cargarCatalogos(): Promise<Catalogos> {
  const ahora = Date.now();

  if (cacheCatalogos && ahora - ultimaActualizacion < CACHE_TTL) {
    return cacheCatalogos;
  }

  if (cargando && promesaCompartida) return promesaCompartida;

  cargando = true;

  promesaCompartida = (async () => {
    try {
      const [areas, niveles, categorias] = await Promise.all([
        prisma.areas.findMany({ where: { estado: true } }),
        prisma.niveles.findMany({ where: { estado: true } }),
        prisma.categorias.findMany({
          where: { estado: true },
          select: { id: true, gestion: true, area_id: true, nivel_id: true, modalidad: true }
        })
      ]);

      const areasPorNombre = new Map<string, { id: number }>();
      for (const a of areas) {
        areasPorNombre.set(a.nombre.toUpperCase(), { id: a.id });
      }

      const nivelesPorNombre = new Map<string, { id: number }>();
      for (const n of niveles) {
        nivelesPorNombre.set(n.nombre.toUpperCase(), { id: n.id });
      }

      const categoriasPorClave = new Map<
        string,
        { id: number; gestion: number; modalidad: ModalidadCategoria; areaId: number; nivelId: number }
      >();

      for (const c of categorias) {
        const clave = `${c.area_id}|${c.nivel_id}|${c.modalidad}`;
        const existente = categoriasPorClave.get(clave);

        if (!existente || c.gestion > existente.gestion) {
          categoriasPorClave.set(clave, {
            id: c.id,
            gestion: c.gestion,
            modalidad: c.modalidad,
            areaId: c.area_id,
            nivelId: c.nivel_id
          });
        }
      }

      cacheCatalogos = { areasPorNombre, nivelesPorNombre, categoriasPorClave };
      ultimaActualizacion = Date.now();
      return cacheCatalogos;
    } finally {
      cargando = false;
    }
  })();

  return promesaCompartida;
}

export function limpiarCacheCatalogos() {
  cacheCatalogos = null;
  ultimaActualizacion = 0;
  console.log('Caché de catálogos limpiado manualmente.');
}
