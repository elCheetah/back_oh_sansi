import { Sexo, TipoDocumento, RolEquipo } from '@prisma/client';
import { mayus, soloDigitos, normalizarDepartamento, DEPARTAMENTOS_BO } from './importarCSVNormalizacion';

export function esEmail(val: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function esFechaISO(val: string) {
    if (!val) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(val) && !Number.isNaN(Date.parse(val));
}

export function validarTelefono(tel: string) {
    const d = soloDigitos(tel);
    return d.length >= 7;
}

export function enEnumTipoDoc(val: string): val is keyof typeof TipoDocumento {
    const v = mayus(val);
    return ['CI', 'PASAPORTE', 'CARNET_EXTRANJERO', 'CERTIFICADO_NACIMIENTO'].includes(v);
}

export function enEnumSexo(val: string): val is keyof typeof Sexo {
    const v = mayus(val);
    return v === '' || ['MASCULINO', 'FEMENINO', 'OTRO'].includes(v);
}

export function enEnumRolEquipo(val: string): val is keyof typeof RolEquipo {
    const v = mayus(val);
    return ['LIDER', 'PARTICIPANTE'].includes(v);
}

export function validarDepartamento(val: string) {
    const dep = normalizarDepartamento(val);
    return DEPARTAMENTOS_BO.has(dep);
}

export function gradoPareceValido(val: string) {
    if (!val) return true;
    const v = mayus(val).normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return /(PRIM|SEC|[0-9]+(TO|MO)|QUINTO|SEXTO|SEPTIMO|OCTAVO|NOVENO|BACHILLER)/.test(v);
}
