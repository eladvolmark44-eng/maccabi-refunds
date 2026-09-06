// ============================================================
// מעקב החזר מנוי - מכבי חיפה
// ============================================================

const DEFAULT_PRICES = { popcorn: 20, gummy: 15, drink: 10, icecream: 15 };
const DEFAULT_SUBSCRIPTION_PRICE = 2000;
const ITEM_LABELS = { popcorn: "פופקורן", gummy: "גומי", drink: "שתייה", icecream: "גלידה" };
const ITEM_COLORS = { popcorn: "#c9a227", gummy: "#e05d5d", drink: "#0a7a3c", icecream: "#4fc3e0" };
const ITEM_ICONS = { popcorn: "🍿", gummy: "🍬", drink: "🥤", icecream: "🍦" };
const LOCAL_STORAGE_KEY = "mh-refund-games-v1";
const SEED_FLAG_KEY = "mh-refund-seeded-v1";
const SETTINGS_STORAGE_KEY = "mh-refund-settings-v1";

let PRICES = { ...DEFAULT_PRICES };
let SUBSCRIPTION_PRICE = DEFAULT_SUBSCRIPTION_PRICE;

let games = []; // in-memory cache of games, each: {id, date, competition, opponent, venue, home, final, popcorn, gummy, drink, icecream}
let chart = null;
let usingFirestore = false;
let db = null;

function isFirebaseConfigured() {
  return typeof firebaseConfig !== "undefined" && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
}

function uid() {
  return "g_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// All trackable snack categories, in display order. Adding a new one only
// requires an entry in DEFAULT_PRICES/ITEM_LABELS/ITEM_COLORS/ITEM_ICONS above.
const ITEM_KEYS = Object.keys(ITEM_LABELS);

function zeroQuantities() {
  const q = {};
  ITEM_KEYS.forEach((k) => (q[k] = 0));
  return q;
}

// Stable ID for a seeded game, so re-seeding an empty collection twice
// (e.g. two tabs loading at once) writes the same 29 docs instead of
// creating duplicates.
function gameDocId(g) {
  const slug = (s) => (s || "").replace(/["'׳״]/g, "").replace(/[^a-zA-Z0-9א-ת]+/g, "-");
  return `${g.date}_${slug(g.competition)}_${slug(g.opponent)}`;
}

// ---------- Storage layer (Firestore if configured, else localStorage) ----------

function initStorage() {
  if (isFirebaseConfigured()) {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      usingFirestore = true;
      document.getElementById("connection-banner").classList.remove("show");
      seedIfEmptyFirestore();
      listenFirestore();
      listenFirestoreSettings();
      return;
    } catch (e) {
      console.error("Firebase init failed, falling back to local storage", e);
    }
  }
  usingFirestore = false;
  document.getElementById("connection-banner").classList.add("show");
  loadLocalSettings();
  loadLocal();
  seedIfEmptyLocal();
  migrateGameMetadata();
  dedupeGames();
  renderAll();
}

// ---------- Settings (subscription price + item prices) ----------

function loadLocalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.subscriptionPrice) SUBSCRIPTION_PRICE = s.subscriptionPrice;
    if (s.prices) PRICES = { ...PRICES, ...s.prices };
  } catch (e) {
    console.error("Failed to load settings", e);
  }
}

function listenFirestoreSettings() {
  db.collection("settings").doc("config").onSnapshot(
    (doc) => {
      if (!doc.exists) return;
      const s = doc.data();
      if (s.subscriptionPrice) SUBSCRIPTION_PRICE = s.subscriptionPrice;
      if (s.prices) PRICES = { ...PRICES, ...s.prices };
      renderAll();
    },
    (err) => console.error("Settings listen error", err)
  );
}

function saveSettings(subscriptionPrice, prices) {
  SUBSCRIPTION_PRICE = subscriptionPrice;
  PRICES = { ...prices };
  if (usingFirestore) {
    db.collection("settings").doc("config")
      .set({ subscriptionPrice: SUBSCRIPTION_PRICE, prices: PRICES })
      .catch((e) => console.error("Failed to save settings", e));
  } else {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ subscriptionPrice: SUBSCRIPTION_PRICE, prices: PRICES }));
    renderAll();
  }
}

function seedIfEmptyFirestore() {
  db.collection("games").limit(1).get().then((snap) => {
    if (snap.empty) {
      const batch = db.batch();
      SEASON_GAMES_SEED.forEach((g) => {
        const ref = db.collection("games").doc(gameDocId(g));
        batch.set(ref, { ...g, ...zeroQuantities() });
      });
      batch.commit().catch((e) => console.error("Seed failed", e));
    }
  });
}

function listenFirestore() {
  db.collection("games").orderBy("date").onSnapshot(
    (snap) => {
      games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      migrateGameMetadata();
      dedupeGames();
      renderAll();
    },
    (err) => {
      console.error("Firestore listen error", err);
      document.getElementById("connection-banner").classList.add("show");
    }
  );
}

// Reconciles previously-saved games (date/venue/home/final) against the current
// SEASON_GAMES_SEED whenever the schedule is corrected in code, without touching
// the popcorn/gummy/drink counts a user already entered. Matches each saved game
// to the seed entry for the same opponent+competition whose date is closest,
// since most opponents appear twice a season (home leg + away leg).
function migrateGameMetadata() {
  let localChanged = false;
  games.forEach((g) => {
    const candidates = SEASON_GAMES_SEED.filter(
      (s) => s.opponent === g.opponent && s.competition === g.competition
    );
    if (candidates.length === 0) return;

    let best = candidates[0];
    let bestDiff = Math.abs(new Date(g.date) - new Date(best.date));
    candidates.forEach((c) => {
      const diff = Math.abs(new Date(g.date) - new Date(c.date));
      if (diff < bestDiff) {
        best = c;
        bestDiff = diff;
      }
    });

    const updates = {};
    ["date", "venue", "home", "final"].forEach((field) => {
      if (g[field] !== best[field]) updates[field] = best[field];
    });

    if (Object.keys(updates).length > 0) {
      Object.assign(g, updates);
      localChanged = true;
      if (usingFirestore) {
        db.collection("games").doc(g.id).update(updates).catch((e) => console.error("Schedule migration failed", e));
      }
    }
  });
  if (!usingFirestore && localChanged) saveLocal();
}

// Cleans up duplicate game entries (same date+opponent+competition) that could
// have been created by a race in seedIfEmptyFirestore (two tabs both seeding an
// empty collection before either commit finished). Keeps one copy per fixture,
// merging in the highest quantity seen per item so no tracked snack count is lost.
function dedupeGames() {
  const canonicalByKey = new Map();
  const duplicateIds = [];

  games.forEach((g) => {
    const key = `${g.date}|${g.opponent}|${g.competition}`;
    const existing = canonicalByKey.get(key);
    if (!existing) {
      canonicalByKey.set(key, g);
      return;
    }
    ITEM_KEYS.forEach((item) => {
      existing[item] = Math.max(existing[item] || 0, g[item] || 0);
    });
    duplicateIds.push(g.id);
  });

  if (duplicateIds.length === 0) return;

  games = games.filter((g) => !duplicateIds.includes(g.id));

  if (usingFirestore) {
    const batch = db.batch();
    duplicateIds.forEach((id) => batch.delete(db.collection("games").doc(id)));
    canonicalByKey.forEach((g) => {
      const quantities = {};
      ITEM_KEYS.forEach((item) => (quantities[item] = g[item] || 0));
      batch.update(db.collection("games").doc(g.id), quantities);
    });
    batch.commit().catch((e) => console.error("Dedup failed", e));
  } else {
    saveLocal();
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    games = raw ? JSON.parse(raw) : [];
  } catch (e) {
    games = [];
  }
}

function saveLocal() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(games));
}

function seedIfEmptyLocal() {
  if (localStorage.getItem(SEED_FLAG_KEY)) return;
  if (games.length === 0) {
    games = SEASON_GAMES_SEED.map((g) => ({ id: uid(), ...g, ...zeroQuantities() }));
    saveLocal();
  }
  localStorage.setItem(SEED_FLAG_KEY, "1");
}

function updateGameField(gameId, field, value) {
  const num = Math.max(0, parseInt(value, 10) || 0);
  if (usingFirestore) {
    db.collection("games").doc(gameId).update({ [field]: num }).catch((e) => console.error(e));
  } else {
    const g = games.find((x) => x.id === gameId);
    if (g) {
      g[field] = num;
      saveLocal();
      renderAll();
    }
  }
}

function addGame(game) {
  const newGame = { ...game, ...zeroQuantities(), final: true };
  if (usingFirestore) {
    db.collection("games").add(newGame).catch((e) => console.error(e));
  } else {
    games.push({ id: uid(), ...newGame });
    games.sort((a, b) => (a.date > b.date ? 1 : -1));
    saveLocal();
    renderAll();
  }
}

function deleteGame(gameId) {
  if (!confirm("למחוק את המשחק הזה מהרשימה?")) return;
  if (usingFirestore) {
    db.collection("games").doc(gameId).delete().catch((e) => console.error(e));
  } else {
    games = games.filter((g) => g.id !== gameId);
    saveLocal();
    renderAll();
  }
}

// ---------- Calculations ----------

function computeTotals() {
  let totalRefund = 0;
  const perItem = zeroQuantities();
  games.forEach((g) => {
    ITEM_KEYS.forEach((item) => {
      const qty = g[item] || 0;
      const val = qty * PRICES[item];
      totalRefund += val;
      perItem[item] += val;
    });
  });
  return { totalRefund, perItem };
}

function gameTotal(g) {
  return ITEM_KEYS.reduce((sum, item) => sum + (g[item] || 0) * PRICES[item], 0);
}

// ---------- Rendering ----------

function renderAll() {
  renderSummary();
  renderTable();
  try {
    renderChart();
  } catch (e) {
    console.error("Chart render failed", e);
  }
}

function renderSummary() {
  const { totalRefund } = computeTotals();
  const percent = Math.min(999, (totalRefund / SUBSCRIPTION_PRICE) * 100);
  const remaining = Math.max(0, SUBSCRIPTION_PRICE - totalRefund);

  document.getElementById("stat-subscription").textContent = `₪${SUBSCRIPTION_PRICE.toLocaleString()}`;
  document.getElementById("stat-refunded").textContent = `₪${totalRefund.toLocaleString()}`;
  document.getElementById("stat-percent").textContent = `${percent.toFixed(1)}%`;
  document.getElementById("stat-remaining").textContent =
    remaining > 0 ? `₪${remaining.toLocaleString()}` : `כוסה! +₪${(totalRefund - SUBSCRIPTION_PRICE).toLocaleString()}`;

  const barPercent = Math.min(100, percent);
  const minLeft = 12;
  const maxLeft = 90;
  const ballLeft = maxLeft - (barPercent / 100) * (maxLeft - minLeft);
  document.getElementById("progress-ball").style.left = `${ballLeft}%`;
  document.getElementById("progress-text").textContent = `${percent.toFixed(1)}% מתוך ${SUBSCRIPTION_PRICE.toLocaleString()} ₪`;

  const priceLine = document.getElementById("item-prices-line");
  if (priceLine) {
    priceLine.textContent = ITEM_KEYS.map((k) => `${ITEM_LABELS[k]} ₪${PRICES[k]}`).join(" | ");
  }
}

function renderChart() {
  const { perItem } = computeTotals();
  const ctx = document.getElementById("items-chart").getContext("2d");
  const labels = Object.keys(perItem).map((k) => ITEM_LABELS[k]);
  const data = Object.values(perItem);
  const colors = Object.keys(perItem).map((k) => ITEM_COLORS[k]);

  const hasData = data.some((v) => v > 0);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: hasData ? data : data.map(() => 1),
          backgroundColor: hasData ? colors : data.map(() => "#e9ecea"),
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      cutout: "65%",
    },
  });

  const legend = document.getElementById("items-legend");
  legend.innerHTML = "";
  Object.keys(perItem).forEach((k) => {
    const span = document.createElement("span");
    span.innerHTML = `<span class="legend-dot" style="background:${ITEM_COLORS[k]}"></span>${ITEM_LABELS[k]}: ₪${perItem[k].toLocaleString()}`;
    legend.appendChild(span);
  });
}

function qtyStepper(gameId, field, icon, value) {
  return `
    <div class="qty-stepper">
      <span class="qty-icon">${icon}</span>
      <button type="button" class="qty-btn qty-plus" data-id="${gameId}" data-field="${field}" data-dir="1">+</button>
      <span class="qty-value" data-id="${gameId}" data-field="${field}-value">${value}</span>
      <button type="button" class="qty-btn qty-minus" data-id="${gameId}" data-field="${field}" data-dir="-1" ${value <= 0 ? "disabled" : ""}>−</button>
    </div>
  `;
}

function renderTable() {
  const grid = document.getElementById("games-grid");
  grid.innerHTML = "";

  if (games.length === 0) {
    grid.innerHTML = `<div class="games-empty">אין עדיין משחקים ברשימה</div>`;
    return;
  }

  games.forEach((g) => {
    const card = document.createElement("div");
    card.className = "game-card";

    const dateStr = formatDate(g.date);
    const homeAwayLabel = g.home ? "בית" : "חוץ";

    card.innerHTML = `
      <button class="icon-btn" data-id="${g.id}" title="מחיקת משחק">✕</button>
      <div class="game-card-comp">${escapeHtml(g.competition || "")}</div>
      <div class="game-card-opponent"><img class="game-card-logo" src="assets/logo.png" alt="מכבי חיפה" />נגד ${escapeHtml(g.opponent || "")}</div>
      <div class="game-card-meta">
        <span>${homeAwayLabel} • ${escapeHtml(g.venue || "")}</span>
        <span>${dateStr}</span>
      </div>
      <div class="game-card-items">
        ${ITEM_KEYS.map((item) => qtyStepper(g.id, item, ITEM_ICONS[item], g[item] || 0)).join("")}
      </div>
      <div class="game-card-total">סה"כ החזר: ₪${gameTotal(g).toLocaleString()}</div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const gameId = e.currentTarget.dataset.id;
      const field = e.currentTarget.dataset.field;
      const dir = parseInt(e.currentTarget.dataset.dir, 10);
      const g = games.find((x) => x.id === gameId);
      const current = g ? g[field] || 0 : 0;
      const next = Math.max(0, current + dir);
      updateGameField(gameId, field, next);
    });
  });

  grid.querySelectorAll(".icon-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      deleteGame(e.target.dataset.id);
    });
  });
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Add game modal ----------

function setupModal() {
  const overlay = document.getElementById("add-game-modal");
  document.getElementById("open-add-game").addEventListener("click", () => {
    overlay.classList.add("show");
  });
  document.getElementById("cancel-add-game").addEventListener("click", () => {
    overlay.classList.remove("show");
  });
  document.getElementById("confirm-add-game").addEventListener("click", () => {
    const date = document.getElementById("ng-date").value;
    const competition = document.getElementById("ng-competition").value.trim() || "ליגת Winner";
    const opponent = document.getElementById("ng-opponent").value.trim();
    const home = document.getElementById("ng-home").value === "true";

    if (!date || !opponent) {
      alert("נא למלא תאריך ויריב");
      return;
    }

    addGame({
      date,
      competition,
      opponent,
      venue: home ? "סמי עופר" : "חוץ",
      home,
    });

    document.getElementById("ng-date").value = "";
    document.getElementById("ng-competition").value = "";
    document.getElementById("ng-opponent").value = "";
    overlay.classList.remove("show");
  });
}

// ---------- Admin settings modal ----------

function setupSettingsModal() {
  const overlay = document.getElementById("settings-modal");
  document.getElementById("open-settings").addEventListener("click", () => {
    document.getElementById("set-subscription").value = SUBSCRIPTION_PRICE;
    ITEM_KEYS.forEach((item) => {
      const input = document.getElementById(`set-${item}`);
      if (input) input.value = PRICES[item];
    });
    overlay.classList.add("show");
  });
  document.getElementById("cancel-settings").addEventListener("click", () => {
    overlay.classList.remove("show");
  });
  document.getElementById("save-settings").addEventListener("click", () => {
    const subscriptionPrice = Math.max(0, parseInt(document.getElementById("set-subscription").value, 10) || 0);
    const prices = {};
    ITEM_KEYS.forEach((item) => {
      const input = document.getElementById(`set-${item}`);
      prices[item] = Math.max(0, parseInt(input ? input.value : PRICES[item], 10) || 0);
    });
    saveSettings(subscriptionPrice, prices);
    overlay.classList.remove("show");
  });
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  setupModal();
  setupSettingsModal();
  initStorage();
});
