// לוגיקת "חוקיות" התאריכים: אילו יציאות/חזרות נחשבות התאמה, ואיזה טווח לסרוק.

const DAY_MS = 86400000;

const dayOnly = (s) => s.slice(0, 10);
const toUtc = (s) => Date.parse(`${dayOnly(s)}T00:00:00Z`);

export function weekday(dateStr) {
  return new Date(toUtc(dateStr)).getUTCDay(); // 0 = ראשון ... 6 = שבת
}

export function nightsBetween(departStr, returnStr) {
  return Math.round((toUtc(returnStr) - toUtc(departStr)) / DAY_MS);
}

export function addDays(dateStr, n) {
  return new Date(toUtc(dateStr) + n * DAY_MS).toISOString().slice(0, 10);
}

// שעה מקומית מתוך מחרוזת ISO כמו "2026-10-15T21:40:00+03:00" (null אם אין שעה).
function localHour(s) {
  const m = /T(\d{2}):(\d{2})/.exec(s || '');
  return m ? Number(m[1]) + Number(m[2]) / 60 : null;
}

const intList = (v) =>
  String(v || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
    .map(Number)
    .filter((n) => Number.isInteger(n));

const optNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// בונה ומאמת את החוקיות מתוך פרמטרי URL.
export function parsePattern(params, today = new Date().toISOString().slice(0, 10)) {
  const departDays = intList(params.get('departDays')).filter((d) => d >= 0 && d <= 6);
  const minNights = Number(params.get('minNights') ?? 2);
  const maxNights = Number(params.get('maxNights') ?? minNights);
  const months = Math.min(Math.max(Number(params.get('months') || 3), 1), 6);

  const errors = [];
  if (departDays.length === 0) errors.push('יש לבחור לפחות יום יציאה אחד');
  if (!Number.isInteger(minNights) || !Number.isInteger(maxNights) || minNights < 0 || maxNights < minNights || maxNights > 30)
    errors.push('טווח לילות לא תקין');

  const from = params.get('from') && params.get('from') > today ? params.get('from') : today;
  const until = addDays(from, months * 30);

  return {
    errors,
    pattern: {
      departDays,
      minNights,
      maxNights,
      from,
      until,
      directOnly: params.get('direct') === '1',
      maxPrice: optNumber(params.get('maxPrice')),
      departAfter: optNumber(params.get('departAfter')),
      returnAfter: optNumber(params.get('returnAfter')),
    },
  };
}

export function matchesPattern(trip, p) {
  if (!trip.depart || !trip.return) return false;
  const d = dayOnly(trip.depart);
  if (d < p.from || d > p.until) return false;
  if (!p.departDays.includes(weekday(d))) return false;
  const nights = nightsBetween(trip.depart, trip.return);
  if (nights < p.minNights || nights > p.maxNights) return false;
  if (p.directOnly && (trip.transfers > 0 || trip.returnTransfers > 0)) return false;
  if (p.maxPrice != null && trip.price > p.maxPrice) return false;
  const dh = localHour(trip.depart);
  if (p.departAfter != null && dh != null && dh < p.departAfter) return false;
  const rh = localHour(trip.return);
  if (p.returnAfter != null && rh != null && rh < p.returnAfter) return false;
  return true;
}

// כל זוגות (יציאה, חזרה) שמתאימים לחוקיות בטווח - לספקים שמחפשים תאריך-תאריך.
export function candidateDates(p) {
  const out = [];
  for (let d = p.from; d <= p.until; d = addDays(d, 1)) {
    if (!p.departDays.includes(weekday(d))) continue;
    for (let n = p.minNights; n <= p.maxNights; n++) out.push({ depart: d, return: addDays(d, n) });
  }
  return out;
}

// חודשי יציאה ("YYYY-MM") שצריך לבקש כדי לכסות את הטווח.
export function monthsInRange(from, until) {
  const out = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const end = until.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > end) break;
    out.push(key);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

// משאיר את הטיסה הזולה ביותר לכל (יעד, יציאה, חזרה), ממוין מהזול ליקר.
export function cheapestUnique(trips) {
  const best = new Map();
  for (const t of trips) {
    const key = `${t.destination}|${dayOnly(t.depart)}|${dayOnly(t.return)}`;
    const cur = best.get(key);
    if (!cur || t.price < cur.price) best.set(key, t);
  }
  return [...best.values()].sort((a, b) => a.price - b.price);
}

// הסופ״ש שאליו שייכת הטיסה = השבת הראשונה מיום היציאה והלאה.
export function weekendOf(departStr) {
  return addDays(departStr, (6 - weekday(departStr) + 7) % 7);
}

// הזולים ביותר בסך הכול, ובנוסף תמיד הזולה ביותר בכל סופ״ש (כדי שאף סופ״ש לא ייעלם מהתצוגה).
export function topWithEveryWeekend(sorted, limit) {
  const seen = new Set();
  return sorted.filter((t, i) => {
    const w = weekendOf(t.depart);
    const firstOfWeekend = !seen.has(w);
    seen.add(w);
    return i < limit || firstOfWeekend;
  });
}
