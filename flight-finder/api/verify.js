// GET /api/verify?origin=TLV&dest=ATH&depart=2026-10-15&return=2026-10-17
// בודק ב-Google Flights (דרך SerpApi) מה המחיר העדכני כרגע לזוג התאריכים.

import { verifyPrice } from '../lib/providers/serpapi.js';
import { sendJson } from '../lib/http.js';

const date = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const iata = (s) => /^[A-Z]{3}$/.test(s || '');

export default async function handler(req, res) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return sendJson(res, 501, { errors: ['בדיקת מחיר עדכני לא מוגדרת (חסר SERPAPI_KEY)'] });

  const p = new URL(req.url, 'http://localhost').searchParams;
  const origin = (p.get('origin') || '').toUpperCase();
  const destination = (p.get('dest') || '').toUpperCase();
  const depart = p.get('depart');
  const ret = p.get('return');
  if (!iata(origin) || !iata(destination) || !date(depart) || !date(ret))
    return sendJson(res, 400, { errors: ['פרמטרים לא תקינים'] });

  try {
    const result = await verifyPrice({
      origin,
      destination,
      depart,
      ret,
      currency: (p.get('currency') || 'ILS').toUpperCase(),
      directOnly: p.get('direct') === '1',
      apiKey,
    });
    sendJson(res, 200, result, 3600);
  } catch (err) {
    sendJson(res, 502, { errors: [err.message] });
  }
}
