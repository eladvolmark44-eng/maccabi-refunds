import { DESTINATIONS, GROUPS, nameOf } from './destinations.js';

const $ = (id) => document.getElementById(id);
const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const PRESETS = [
  { label: 'חמישי ← שבת', days: [4], min: 2, max: 2 },
  { label: 'חמישי ← ראשון', days: [4], min: 3, max: 3 },
  { label: 'רביעי/חמישי ← שבת', days: [3, 4], min: 2, max: 3 },
  { label: 'שישי ← שבת', days: [5], min: 1, max: 1 },
  { label: 'סופ״ש ארוך (3-4 לילות)', days: [3, 4, 5], min: 3, max: 4 },
];

const state = { dest: [], departDays: new Set([4]), view: 'weekend', sort: 'price', data: null };

// ---------- טופס ----------

function renderDays() {
  $('departDays').innerHTML = DAY_NAMES.map(
    (d, i) => `<button type="button" data-day="${i}" class="${state.departDays.has(i) ? 'on' : ''}" title="${DAY_FULL[i]}">${d}</button>`,
  ).join('');
  const current = PRESETS.findIndex(
    (p) => p.days.length === state.departDays.size && p.days.every((d) => state.departDays.has(d)) &&
      p.min === +$('minNights').value && p.max === +$('maxNights').value,
  );
  [...$('presets').children].forEach((b, i) => b.classList.toggle('on', i === current));
}

function renderChips() {
  $('destChips').querySelectorAll('.chip').forEach((c) => c.remove());
  const input = $('destInput');
  for (const code of state.dest) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `${nameOf(code)} <b>${code}</b> <button type="button" aria-label="הסר">×</button>`;
    chip.querySelector('button').onclick = () => { state.dest = state.dest.filter((c) => c !== code); renderChips(); };
    $('destChips').insertBefore(chip, input);
  }
  input.placeholder = state.dest.length ? 'עוד יעד...' : 'הקלידו עיר או קוד, למשל אתונה / ATH';
}

function resolveDest(text) {
  const t = text.trim();
  if (!t) return null;
  const m = /\b([A-Za-z]{3})\b/.exec(t);
  if (m) return m[1].toUpperCase();
  const hit = Object.entries(DESTINATIONS).find(([, name]) => name === t || name.startsWith(t));
  return hit ? hit[0] : null;
}

function addDest(text) {
  const code = resolveDest(text);
  if (!code) return false;
  if (!state.dest.includes(code)) state.dest.push(code);
  renderChips();
  return true;
}

function initForm() {
  $('destList').innerHTML = Object.entries(DESTINATIONS)
    .filter(([c]) => c !== 'TLV')
    .map(([code, name]) => `<option value="${name} (${code})"></option>`)
    .join('');

  $('groups').innerHTML =
    Object.keys(GROUPS).map((g) => `<button type="button" data-group="${g}">+ ${g}</button>`).join('') +
    '<button type="button" data-group="">נקה</button>';
  $('groups').onclick = (e) => {
    const g = e.target.dataset.group;
    if (g === undefined) return;
    state.dest = g ? [...new Set([...state.dest, ...GROUPS[g]])] : [];
    renderChips();
  };

  const input = $('destInput');
  input.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      if (addDest(input.value)) input.value = '';
    } else if (e.key === 'Backspace' && !input.value && state.dest.length) {
      state.dest.pop();
      renderChips();
    }
  });
  input.addEventListener('change', () => { if (addDest(input.value)) input.value = ''; });

  $('presets').innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.label}</button>`).join('');
  $('presets').onclick = (e) => {
    const p = PRESETS[e.target.dataset.preset];
    if (!p) return;
    state.departDays = new Set(p.days);
    $('minNights').value = p.min;
    $('maxNights').value = p.max;
    renderDays();
  };
  $('departDays').onclick = (e) => {
    const d = e.target.dataset.day;
    if (d === undefined) return;
    const n = Number(d);
    state.departDays.has(n) ? state.departDays.delete(n) : state.departDays.add(n);
    renderDays();
  };
  $('minNights').oninput = $('maxNights').oninput = renderDays;

  const hours = '<option value="">כל שעה</option>' +
    Array.from({ length: 23 }, (_, h) => `<option value="${h + 1}">${String(h + 1).padStart(2, '0')}:00</option>`).join('');
  $('departAfter').innerHTML = hours;
  $('returnAfter').innerHTML = hours;

  $('search').onsubmit = (e) => { e.preventDefault(); search(); };

  document.querySelector('.toggle').onclick = (e) => {
    const v = e.target.dataset.view;
    if (!v) return;
    state.view = v;
    document.querySelectorAll('.toggle button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    renderResults();
  };
}

// ---------- שמירת החיפוש בכתובת (אפשר לשמור כמועדף ולחזור) ----------

function formToParams() {
  const p = new URLSearchParams();
  p.set('origin', $('origin').value.trim().toUpperCase());
  if (state.dest.length) p.set('dest', state.dest.join(','));
  p.set('departDays', [...state.departDays].sort().join(','));
  p.set('minNights', $('minNights').value);
  p.set('maxNights', $('maxNights').value);
  p.set('months', $('months').value);
  if ($('maxPrice').value) p.set('maxPrice', $('maxPrice').value);
  if ($('departAfter').value) p.set('departAfter', $('departAfter').value);
  if ($('returnAfter').value) p.set('returnAfter', $('returnAfter').value);
  if ($('direct').checked) p.set('direct', '1');
  return p;
}

function paramsToForm(p) {
  if (p.get('origin')) $('origin').value = p.get('origin');
  if (p.get('dest')) state.dest = p.get('dest').split(',').filter(Boolean);
  if (p.get('departDays')) state.departDays = new Set(p.get('departDays').split(',').map(Number));
  for (const k of ['minNights', 'maxNights', 'months', 'maxPrice', 'departAfter', 'returnAfter'])
    if (p.get(k)) $(k).value = p.get(k);
  $('direct').checked = p.get('direct') === '1';
}

// ---------- חיפוש ----------

async function search() {
  const params = formToParams();
  history.replaceState(null, '', `?${params}`);
  const btn = $('go');
  btn.disabled = true;
  btn.textContent = '⏳ סורק סופ״שים...';
  $('out').hidden = false;
  $('results').innerHTML = '<li class="loading">סורק את כל התאריכים שמתאימים לחוקיות...</li>';
  $('notice').hidden = true;
  $('summary').textContent = '';
  try {
    const res = await fetch(`api/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error((data.errors || ['שגיאה']).join(' · '));
    state.data = data;
    renderResults();
  } catch (err) {
    state.data = null;
    $('results').innerHTML = `<li class="error">${escapeHtml(err.message)}</li>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🔎 מצא לי סופ״ש זול';
  }
}

// ---------- תצוגה ----------

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ymd = (s) => s.slice(0, 10);
const utc = (s) => new Date(`${ymd(s)}T00:00:00Z`);
const fmtDate = (s) => {
  const d = utc(s);
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()}.${d.getUTCMonth() + 1}`;
};
const fmtTime = (s) => (/T(\d{2}:\d{2})/.exec(s) || [])[1] || '';
const nights = (t) => Math.round((utc(t.return) - utc(t.depart)) / 86400000);
const money = (n, cur) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: cur || 'ILS', maximumFractionDigits: 0 }).format(n);

// הסופ״ש שאליו שייכת הטיסה = השבת הראשונה מיום היציאה והלאה.
function weekendKey(t) {
  const d = utc(t.depart);
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

function visibleTrips() {
  const all = state.data.results;
  if (state.view === 'all') return all.map((t) => ({ t, more: 0 }));
  const byWeekend = new Map();
  for (const t of all) {
    const k = weekendKey(t);
    const g = byWeekend.get(k);
    if (!g) byWeekend.set(k, { t, more: 0 });
    else g.more++;
  }
  return [...byWeekend.values()].sort((a, b) => a.t.price - b.t.price);
}

function stopsLabel(n) {
  return n ? `${n} עצירות`.replace(/^1 עצירות$/, 'עצירה אחת') : 'ישירה';
}

function renderResults() {
  const data = state.data;
  if (!data) return;
  const notice = [];
  if (data.demo) notice.push('⚠️ מצב דמו: אלה מחירים מומצאים. כדי לקבל מחירים אמיתיים צריך להגדיר TRAVELPAYOUTS_TOKEN (ראו README).');
  if (data.failures?.length) notice.push(`חלק מהחיפושים נכשלו (${data.failures.length}) - ייתכן שחסרות תוצאות.`);
  $('notice').hidden = !notice.length;
  $('notice').innerHTML = notice.map(escapeHtml).join('<br>');

  const rows = visibleTrips();
  const weekends = new Set(data.results.map(weekendKey)).size;
  $('summary').innerHTML = data.results.length
    ? `נמצאו <b>${data.totalMatches}</b> אפשרויות ב-<b>${weekends}</b> סופ״שים · הזול ביותר: <b>${money(data.results[0].price, data.results[0].currency)}</b>`
    : '';

  if (!rows.length) {
    $('results').innerHTML = '<li class="empty">לא נמצאו טיסות שמתאימות לחוקיות. נסו להרחיב את טווח הלילות, להוסיף ימי יציאה, להוסיף יעדים או לסרוק תקופה ארוכה יותר.</li>';
    return;
  }

  const cheapest = rows[0].t.price;
  $('results').innerHTML = rows.map(({ t, more }, i) => {
    const l = t.links || {};
    const linkBtn = (url, label) => (url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>` : '');
    return `
      <li class="card ${t.price === cheapest ? 'best' : ''}" data-i="${i}">
        <div class="price">
          ${money(t.price, t.currency)}
          ${t.price === cheapest ? '<span class="tag">הכי זול</span>' : ''}
        </div>
        <div class="info">
          <div class="dest">${escapeHtml(nameOf(t.destination))} <small>${escapeHtml(t.destinationAirport || t.destination)}</small></div>
          <div class="dates">
            ${fmtDate(t.depart)} <small>${fmtTime(t.depart)}</small> ← ${fmtDate(t.return)} <small>${fmtTime(t.return)}</small>
            · ${nights(t)} לילות
          </div>
          <div class="meta">
            ${escapeHtml(t.airline || '')} · הלוך ${stopsLabel(t.transfers)} · חזור ${stopsLabel(t.returnTransfers)}
            ${more ? ` · <span class="more">+${more} אפשרויות נוספות בסופ״ש הזה</span>` : ''}
          </div>
        </div>
        <div class="links">
          ${linkBtn(l.aviasales, 'הזמנה ב-Aviasales')}
          ${linkBtn(l.google, 'Google Flights')}
          ${linkBtn(l.skyscanner, 'Skyscanner')}
          ${linkBtn(l.kayak, 'Kayak')}
          ${data.verifyAvailable ? '<button type="button" class="verify">בדוק מחיר עדכני</button>' : ''}
          <span class="verified"></span>
        </div>
      </li>`;
  }).join('');

  $('results').querySelectorAll('.verify').forEach((btn) => {
    btn.onclick = () => verify(btn, rows[+btn.closest('.card').dataset.i].t);
  });
}

async function verify(btn, t) {
  const out = btn.parentElement.querySelector('.verified');
  btn.disabled = true;
  out.textContent = 'בודק...';
  const p = new URLSearchParams({
    origin: t.originAirport || t.origin,
    dest: t.destinationAirport || t.destination,
    depart: ymd(t.depart),
    return: ymd(t.return),
    currency: t.currency || 'ILS',
  });
  if ($('direct').checked) p.set('direct', '1');
  try {
    const res = await fetch(`api/verify?${p}`);
    const data = await res.json();
    if (!res.ok) throw new Error((data.errors || ['שגיאה']).join(' · '));
    out.innerHTML = data.price
      ? `Google Flights עכשיו: <b>${money(data.price, t.currency)}</b>${data.url ? ` · <a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">פתח</a>` : ''}`
      : 'לא נמצא מחיר עדכני לתאריכים האלה';
  } catch (err) {
    out.textContent = err.message;
    btn.disabled = false;
  }
}

// ---------- התחלה ----------

initForm();
const initial = new URLSearchParams(location.search);
paramsToForm(initial);
renderChips();
renderDays();
if (initial.has('departDays')) search();
