import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
if (!SHEET_ID) console.warn('⚠️ GOOGLE_SHEET_ID no está definido en .env');

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Faltan credenciales de Google en .env (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)');
  }
  return new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
}

async function getFirstSheetTitle(auth: any): Promise<string> {
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const first = meta.data.sheets?.[0]?.properties?.title;
  if (!first) throw new Error('No se encontró la primera hoja en el Spreadsheet.');
  return first;
}

export async function subirYReemplazarContenido(filas: any[]) {
  if (!filas || filas.length === 0) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const title = await getFirstSheetTitle(auth);

  const headers = Object.keys(filas[0]);
  const values = [headers, ...filas.map((f) => headers.map((h) => f[h] ?? ''))];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${title}!A1:ZZZ`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${title}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });
}

export async function leerContenidoPrimeraHoja(): Promise<any[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const title = await getFirstSheetTitle(auth);

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${title}!A1:ZZZ`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  });

  const rows = resp.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0].map((h: any) => String(h || '').trim());
  const dataRows = rows.slice(1);

  const objetos = dataRows.map((r: any[]) => {
    const obj: Record<string, any> = {};
    headers.forEach((h: string, i: number) => {
      obj[h] = r[i] ?? '';
    });
    return obj;
  });

  return objetos.filter((o) => Object.values(o).some((v) => (v ?? '') !== ''));
}
