import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePattern, matchesPattern, candidateDates, monthsInRange, cheapestUnique, weekday, addDays, weekendOf, topWithEveryWeekend } from '../lib/pattern.js';
import { compareLinks } from '../lib/links.js';
import handler from '../api/search.js';

const thuToSat = () =>
  parsePattern(new URLSearchParams('departDays=4&minNights=2&maxNights=2&months=1'), '2026-10-10').pattern;

test('weekday uses the calendar date, ignoring time zone offset', () => {
  assert.equal(weekday('2026-10-15T23:30:00+03:00'), 4); // חמישי
  assert.equal(weekday('2026-10-17'), 6); // שבת
});

test('parsePattern validates input', () => {
  assert.ok(parsePattern(new URLSearchParams('departDays=&minNights=2')).errors.length);
  assert.ok(parsePattern(new URLSearchParams('departDays=4&minNights=3&maxNights=1')).errors.length);
  const { pattern, errors } = parsePattern(new URLSearchParams('departDays=4,9&months=12'), '2026-10-10');
  assert.deepEqual(errors, []);
  assert.deepEqual(pattern.departDays, [4]);
  assert.equal(pattern.until, '2027-04-08'); // מוגבל ל-6 חודשים
});

test('matchesPattern: Thursday to Saturday', () => {
  const p = thuToSat();
  const trip = { depart: '2026-10-15T20:00:00+03:00', return: '2026-10-17T22:00:00+03:00', price: 500, transfers: 0, returnTransfers: 0 };
  assert.ok(matchesPattern(trip, p));
  assert.ok(!matchesPattern({ ...trip, depart: '2026-10-14T20:00:00+03:00' }, p), 'Wednesday');
  assert.ok(!matchesPattern({ ...trip, return: '2026-10-18T10:00:00+03:00' }, p), '3 nights');
  assert.ok(!matchesPattern({ ...trip, depart: '2026-10-08T20:00:00+03:00', return: '2026-10-10T20:00:00+03:00' }, p), 'in the past');
  assert.ok(!matchesPattern({ ...trip, transfers: 1 }, { ...p, directOnly: true }));
  assert.ok(!matchesPattern(trip, { ...p, maxPrice: 400 }));
  assert.ok(!matchesPattern(trip, { ...p, departAfter: 21 }));
  assert.ok(matchesPattern(trip, { ...p, departAfter: 18, returnAfter: 20 }));
});

test('candidateDates lists every matching weekend', () => {
  const dates = candidateDates(thuToSat());
  assert.deepEqual(dates.slice(0, 2), [
    { depart: '2026-10-15', return: '2026-10-17' },
    { depart: '2026-10-22', return: '2026-10-24' },
  ]);
  assert.ok(dates.every((d) => weekday(d.depart) === 4));
});

test('monthsInRange crosses the year', () => {
  assert.deepEqual(monthsInRange('2026-11-20', '2027-02-01'), ['2026-11', '2026-12', '2027-01', '2027-02']);
});

test('cheapestUnique keeps the cheapest per route and dates, sorted', () => {
  const t = (destination, price, depart = '2026-10-15T08:00') => ({ destination, price, depart, return: '2026-10-17T20:00' });
  const out = cheapestUnique([t('ATH', 700), t('ATH', 500), t('LCA', 400), t('ATH', 450, '2026-10-15T22:00')]);
  assert.deepEqual(out.map((x) => [x.destination, x.price]), [['LCA', 400], ['ATH', 450]]);
});

test('compareLinks builds per-site URLs', () => {
  const l = compareLinks({ origin: 'TLV', destination: 'ROM', destinationAirport: 'FCO', depart: '2026-10-15T08:00', return: '2026-10-17T20:00', bookingPath: '/search/TLV1510FCO17101?t=x' }, 'm1');
  assert.equal(l.skyscanner, 'https://www.skyscanner.co.il/transport/flights/tlv/fco/261015/261017/');
  assert.equal(l.kayak, 'https://www.kayak.com/flights/TLV-FCO/2026-10-15/2026-10-17');
  assert.equal(l.aviasales, 'https://www.aviasales.com/search/TLV1510FCO17101?t=x&marker=m1');
});

function call(url) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b) }); } };
    handler({ url }, res);
  });
}

test('search API in demo mode returns only matching trips', async () => {
  delete process.env.TRAVELPAYOUTS_TOKEN;
  const { status, body } = await call('/api/search?dest=ATH,LCA&departDays=4&minNights=2&maxNights=3&months=2');
  assert.equal(status, 200);
  assert.equal(body.demo, true);
  assert.ok(body.results.length > 0);
  for (const t of body.results) {
    assert.equal(weekday(t.depart), 4);
    assert.ok(['ATH', 'LCA'].includes(t.destination));
  }
  const prices = body.results.map((t) => t.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test('search API rejects bad input', async () => {
  const { status, body } = await call('/api/search?dest=ATHENS&departDays=4');
  assert.equal(status, 400);
  assert.match(body.errors.join(), /ATHENS/);
});

test('search API uses Travelpayouts when a token is set', async (t) => {
  process.env.TRAVELPAYOUTS_TOKEN = 'tok';
  const today = new Date().toISOString().slice(0, 10);
  const thu = addDays(today, ((4 - weekday(today) + 7) % 7) || 7);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(new URL(url));
    return new Response(JSON.stringify({
      success: true, currency: 'ils',
      data: [
        { origin: 'TLV', destination: 'ATH', origin_airport: 'TLV', destination_airport: 'ATH', price: 610, airline: 'W6', departure_at: `${thu}T19:00:00+03:00`, return_at: `${addDays(thu, 2)}T21:00:00+03:00`, transfers: 0, return_transfers: 0, link: '/search/x' },
        { origin: 'TLV', destination: 'ATH', origin_airport: 'TLV', destination_airport: 'ATH', price: 300, airline: 'W6', departure_at: `${addDays(thu, -2)}T19:00:00+03:00`, return_at: `${addDays(thu, 2)}T21:00:00+03:00`, transfers: 0, return_transfers: 0, link: '/search/y' },
      ],
    }));
  });
  try {
    const { status, body } = await call('/api/search?dest=ATH&departDays=4&minNights=2&maxNights=2&months=1');
    assert.equal(status, 200);
    assert.equal(body.demo, false);
    assert.ok(calls.length >= 1 && calls.every((u) => u.searchParams.get('token') === 'tok' && u.searchParams.get('destination') === 'ATH'));
    assert.deepEqual(body.results.map((r) => r.price), [610]); // הטיסה של יום שלישי סוננה
    assert.equal(body.results[0].currency, 'ILS');
  } finally {
    delete process.env.TRAVELPAYOUTS_TOKEN;
  }
});

test('topWithEveryWeekend keeps the cheapest trip of every weekend', () => {
  assert.equal(weekendOf('2026-10-15T20:00'), '2026-10-17');
  assert.equal(weekendOf('2026-10-17'), '2026-10-17');
  const t = (depart, price) => ({ depart, price });
  const out = topWithEveryWeekend([t('2026-10-15', 1), t('2026-10-14', 2), t('2026-10-22', 3), t('2026-10-29', 4), t('2026-10-21', 5)], 2);
  assert.deepEqual(out.map((x) => x.price), [1, 2, 3, 4]);
});
