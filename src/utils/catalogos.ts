import prisma from './../config/database';

export type Catalogos = {
    areasPorCodigo: Map<string, { id: number; nombre: string }>;
    areasPorNombre: Map<string, { id: number; codigo: string | null }>;
    nivelesPorCodigo: Map<string, { id: number; nombre: string }>;
    nivelesPorNombre: Map<string, { id: number; codigo: string | null }>;
};

export async function cargarCatalogos(): Promise<Catalogos> {
    const areas = await prisma.areas.findMany({ where: { estado: true } });
    const niveles = await prisma.niveles.findMany({ where: { estado: true } });

    const areasPorCodigo = new Map<string, { id: number; nombre: string }>();
    const areasPorNombre = new Map<string, { id: number; codigo: string | null }>();

    for (const a of areas) {
        if (a.codigo) areasPorCodigo.set(a.codigo.toUpperCase(), { id: a.id, nombre: a.nombre });
        areasPorNombre.set(a.nombre.toUpperCase(), { id: a.id, codigo: a.codigo });
    }

    const nivelesPorCodigo = new Map<string, { id: number; nombre: string }>();
    const nivelesPorNombre = new Map<string, { id: number; codigo: string | null }>();

    for (const n of niveles) {
        if (n.codigo) nivelesPorCodigo.set(n.codigo.toUpperCase(), { id: n.id, nombre: n.nombre });
        nivelesPorNombre.set(n.nombre.toUpperCase(), { id: n.id, codigo: n.codigo });
    }

    return { areasPorCodigo, areasPorNombre, nivelesPorCodigo, nivelesPorNombre };
}
