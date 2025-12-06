export function limpiarCadena(v?: string | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s || ['N/A', 'NULL', '—', '-', 'NA'].includes(s.toUpperCase())) return '';
  return s.replace(/\s+/g, ' ');
}

export function mayus(v: string): string {
  return limpiarCadena(v).toUpperCase();
}

export function soloDigitos(v: string): string {
  return limpiarCadena(v).replace(/\D+/g, '');
}

export function emailMinusculas(v: string): string {
  return limpiarCadena(v).toLowerCase();
}

export function normalizarFila(fila: Record<string, any>): Record<string, any> {
  const copia: Record<string, any> = { ...fila };

  ['MODALIDAD', 'OLI_TDOC', 'OLI_SEXO', 'ROL_EQUIPO', 'AREA_NOMBRE', 'NIVEL_NOMBRE'].forEach((k) => {
    if (k in copia) copia[k] = mayus(copia[k]);
  });

  Object.keys(copia).forEach((k) => {
    copia[k] = limpiarCadena(copia[k]);
  });

  if ('TUTOR_CORREO' in copia) copia['TUTOR_CORREO'] = emailMinusculas(copia['TUTOR_CORREO']);
  if ('OLI_CORREO' in copia) copia['OLI_CORREO'] = emailMinusculas(copia['OLI_CORREO']);
  if ('TUTOR_TEL' in copia) copia['TUTOR_TEL'] = soloDigitos(copia['TUTOR_TEL']);

  return copia;
}
