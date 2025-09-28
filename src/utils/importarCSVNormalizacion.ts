export const VACIOS = new Set(['', 'N/A', 'NULL', '—', '-', 'NA']);

export function aVacio(val: unknown): string {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (VACIOS.has(s.toUpperCase())) return '';
    return s;
}

export function mayus(val: string) {
    return aVacio(val).toUpperCase();
}
export function minus(val: string) {
    return aVacio(val).toLowerCase();
}

export function soloDigitos(val: string) {
    return aVacio(val).replace(/\D+/g, '');
}

export function recortar(val: string, max: number) {
    const s = aVacio(val);
    return s.length > max ? s.slice(0, max) : s;
}

export const DEPARTAMENTOS_BO = new Set([
    'LA PAZ', 'SANTA CRUZ', 'COCHABAMBA', 'ORURO', 'POTOSI', 'POTOSÍ', 'TARIJA', 'CHUQUISACA', 'BENI', 'PANDO'
]);

export function normalizarDepartamento(val: string) {
    const dep = mayus(val).replace('Í', 'I');
    return dep;
}
