import prisma from './../config/database';

export type Catalogos = {
    areasPorCodigo: Map<string, { id: number; nombre: string }>;
    areasPorNombre: Map<string, { id: number; codigo: string | null }>;
    nivelesPorCodigo: Map<string, { id: number; nombre: string }>;
    nivelesPorNombre: Map<string, { id: number; codigo: string | null }>;
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
            const [areas, niveles] = await Promise.all([
                prisma.areas.findMany({ where: { estado: true } }),
                prisma.niveles.findMany({ where: { estado: true } }),
            ]);

            const areasPorCodigo = new Map<string, { id: number; nombre: string }>();
            const areasPorNombre = new Map<string, { id: number; codigo: string | null }>();

            for (const a of areas) {
                if (a.codigo)
                    areasPorCodigo.set(a.codigo.toUpperCase(), { id: a.id, nombre: a.nombre });
                areasPorNombre.set(a.nombre.toUpperCase(), { id: a.id, codigo: a.codigo });
            }

            const nivelesPorCodigo = new Map<string, { id: number; nombre: string }>();
            const nivelesPorNombre = new Map<string, { id: number; codigo: string | null }>();

            for (const n of niveles) {
                if (n.codigo)
                    nivelesPorCodigo.set(n.codigo.toUpperCase(), { id: n.id, nombre: n.nombre });
                nivelesPorNombre.set(n.nombre.toUpperCase(), { id: n.id, codigo: n.codigo });
            }

            cacheCatalogos = { areasPorCodigo, areasPorNombre, nivelesPorCodigo, nivelesPorNombre };
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
