// ============================================================
// מעקב החזר מנוי - מכבי חיפה
// ============================================================

const PRICES = { popcorn: 20, gummy: 15, drink: 10 };
const ITEM_LABELS = { popcorn: "פופקורן", gummy: "גומי", drink: "שתייה" };
const ITEM_COLORS = { popcorn: "#c9a227", gummy: "#e05d5d", drink: "#0a7a3c" };
const SUBSCRIPTION_PRICE = 2000;
const LOCAL_STORAGE_KEY = "mh-refund-games-v1";
const SEED_FLAG_KEY = "mh-refund-seeded-v1";

let games = []; // in-memory cache of games, each: {id, date, competition, opponent, venue, home, final, popcorn, gummy, drink}
let chart = null;
let usingFirestore = false;
let db = null;

function isFirebaseConfigured() {
  return typeof firebaseConfig !== "undefined" && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";
}

function uid() {
  return "g_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
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
      return;
    } catch (e) {
      console.error("Firebase init failed, falling back to local storage", e);
    }
  }
  usingFirestore = false;
  document.getElementById("connection-banner").classList.add("show");
  loadLocal();
  seedIfEmptyLocal();
  renderAll();
}

function seedIfEmptyFirestore() {
  db.collection("games").limit(1).get().then((snap) => {
    if (snap.empty) {
      const batch = db.batch();
      SEASON_GAMES_SEED.forEach((g) => {
        const ref = db.collection("games").doc();
        batch.set(ref, { ...g, popcorn: 0, gummy: 0, drink: 0 });
      });
      batch.commit().catch((e) => console.error("Seed failed", e));
    }
  });
}

function listenFirestore() {
  db.collection("games").orderBy("date").onSnapshot(
    (snap) => {
      games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderAll();
    },
    (err) => {
      console.error("Firestore listen error", err);
      document.getElementById("connection-banner").classList.add("show");
    }
  );
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
    games = SEASON_GAMES_SEED.map((g) => ({ id: uid(), ...g, popcorn: 0, gummy: 0, drink: 0 }));
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
  const newGame = { ...game, popcorn: 0, gummy: 0, drink: 0, final: true };
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
  const perItem = { popcorn: 0, gummy: 0, drink: 0 };
  games.forEach((g) => {
    ["popcorn", "gummy", "drink"].forEach((item) => {
      const qty = g[item] || 0;
      const val = qty * PRICES[item];
      totalRefund += val;
      perItem[item] += val;
    });
  });
  return { totalRefund, perItem };
}

function gameTotal(g) {
  return (g.popcorn || 0) * PRICES.popcorn + (g.gummy || 0) * PRICES.gummy + (g.drink || 0) * PRICES.drink;
}

// ---------- Rendering ----------

function renderAll() {
  renderSummary();
  renderChart();
  renderTable();
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
  document.getElementById("progress-bar").style.width = `${Math.max(2, barPercent)}%`;
  document.getElementById("progress-text").textContent = `${percent.toFixed(1)}% מתוך ${SUBSCRIPTION_PRICE.toLocaleString()} ₪`;
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
          data: hasData ? data : [1, 1, 1],
          backgroundColor: hasData ? colors : ["#e9ecea", "#e9ecea", "#e9ecea"],
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
    if (g.final === false) card.classList.add("not-final");

    const dateStr = formatDate(g.date);
    const homeAwayLabel = g.home ? "בית" : "חוץ";

    card.innerHTML = `
      <button class="icon-btn" data-id="${g.id}" title="מחיקת משחק">✕</button>
      <div class="game-card-comp">${escapeHtml(g.competition || "")}</div>
      <div class="game-card-opponent">נגד ${escapeHtml(g.opponent || "")}</div>
      <div class="game-card-meta">
        <span>${homeAwayLabel} • ${escapeHtml(g.venue || "")}</span>
        <span>${dateStr}${g.final === false ? " (טרם סופי)" : ""}</span>
      </div>
      <div class="game-card-items">
        <label>🍿<input type="number" min="0" class="qty-input" data-id="${g.id}" data-field="popcorn" value="${g.popcorn || 0}" /></label>
        <label>🍬<input type="number" min="0" class="qty-input" data-id="${g.id}" data-field="gummy" value="${g.gummy || 0}" /></label>
        <label>🥤<input type="number" min="0" class="qty-input" data-id="${g.id}" data-field="drink" value="${g.drink || 0}" /></label>
      </div>
      <div class="game-card-total">סה"כ החזר: ₪${gameTotal(g).toLocaleString()}</div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      updateGameField(e.target.dataset.id, e.target.dataset.field, e.target.value);
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

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  setupModal();
  initStorage();
});
