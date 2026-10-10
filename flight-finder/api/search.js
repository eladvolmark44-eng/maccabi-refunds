// GET /api/search?origin=TLV&dest=ATH,LCA&departDays=4&minNights=2&maxNights=2&months=3
// סורק את כל החודשים בטווח לכל יעד, מסנן לפי החוקיות ומחזיר את הזולים ביותר.

import { parsePattern, matchesPattern, monthsInRange, cheapestUnique, topWithEveryWeekend } from '../lib/pattern.js';
import { compareLinks } from '../lib/links.js';
import { searchMonth } from '../lib/providers/travelpayouts.js';
import { searchDemo } from '../lib/providers/mock.js';
import { sendJson } from '../lib/http.js';

const MAX_DESTINATIONS = 20;
const MAX_RESULTS = 150;
const CONCURRENCY = 6;

const iata = (s) => /^[A-Z]{3}$/.test(s);

async function runLimited(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await tasks[i]() };
      } catch (err) {
        results[i] = { ok: false, error: err.message };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const { pattern, errors } = parsePattern(params);

  const origin = (params.get('origin') || 'TLV').trim().toUpperCase();
  const destinations = [...new Set((params.get('dest') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const currency = (params.get('currency') || 'ILS').toUpperCase();

  if (!iata(origin)) errors.push('קוד שדה מוצא לא תקין');
  const badDest = destinations.filter((d) => !iata(d));
  if (badDest.length) errors.push(`קודי יעד לא תקינים: ${badDest.join(', ')}`);
  if (destinations.length > MAX_DESTINATIONS) errors.push(`עד ${MAX_DESTINATIONS} יעדים בחיפוש אחד`);
  if (errors.length) return sendJson(res, 400, { errors });

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  const demo = !token;
  let trips;
  const failures = [];

  if (demo) {
    trips = searchDemo({ origin, destinations, pattern, currency });
  } else {
    const months = monthsInRange(pattern.from, pattern.until);
    const targets = destinations.length ? destinations : [null]; // null = כל יעד
    const jobs = targets.flatMap((destination) =>
      months.map((month) => ({ destination, month })),
    );
    const results = await runLimited(
      jobs.map((j) => () =>
        searchMonth({ origin, destination: j.destination, month: j.month, currency, directOnly: pattern.directOnly, token }),
      ),
      CONCURRENCY,
    );
    trips = [];
    results.forEach((r, i) => {
      if (r.ok) trips.push(...r.value);
      else failures.push(`${jobs[i].destination || 'כל היעדים'} ${jobs[i].month}: ${r.error}`);
    });
    if (failures.length === jobs.length) return sendJson(res, 502, { errors: ['ספק המחירים לא זמין כרגע', ...failures.slice(0, 3)] });
  }

  const marker = process.env.TRAVELPAYOUTS_MARKER;
  const matched = cheapestUnique(trips.filter((t) => matchesPattern(t, pattern)));
  const results = topWithEveryWeekend(matched, MAX_RESULTS).map((t) => ({ ...t, links: compareLinks(t, marker) }));

  sendJson(
    res,
    200,
    {
      demo,
      verifyAvailable: Boolean(process.env.SERPAPI_KEY),
      searchedAt: new Date().toISOString(),
      pattern,
      totalMatches: matched.length,
      results,
      failures,
    },
    demo ? 0 : 1800,
  );
}
