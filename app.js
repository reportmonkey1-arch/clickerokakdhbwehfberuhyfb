const tg = window.Telegram?.WebApp;

const els = {
  coins: document.querySelector("#coins"),
  power: document.querySelector("#power"),
  league: document.querySelector("#league"),
  tap: document.querySelector("#tapButton"),
  upgrade: document.querySelector("#upgradeButton"),
  boost: document.querySelector("#boostButton"),
  upgradeCost: document.querySelector("#upgradeCost"),
  boostCost: document.querySelector("#boostCost"),
  leaderboard: document.querySelector("#leaderboard"),
  status: document.querySelector("#status"),
  playerName: document.querySelector("#playerName"),
  sync: document.querySelector("#syncButton"),
};

const user = tg?.initDataUnsafe?.user;
const player = {
  id: user?.id ? String(user.id) : "local-player",
  name: user?.username || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Guest",
};

const storeKey = "tapforge-league-state-v1";
const boardKey = "tapforge-league-board-v1";

let state = load(storeKey, {
  coins: 0,
  power: 1,
  boostUntil: 0,
  total: 0,
});

let board = load(boardKey, [
  { id: "bot-1", name: "NovaTap", score: 1850 },
  { id: "bot-2", name: "ClickSmith", score: 1240 },
  { id: "bot-3", name: "MintRush", score: 760 },
]);

tg?.ready();
tg?.expand();
tg?.setHeaderColor?.("#09100f");
tg?.setBackgroundColor?.("#09100f");

els.playerName.textContent = player.name;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state));
  upsertScore();
  localStorage.setItem(boardKey, JSON.stringify(board));
}

function clickPower() {
  return Date.now() < state.boostUntil ? state.power * 2 : state.power;
}

function upgradeCost() {
  return Math.floor(25 * Math.pow(1.55, state.power - 1));
}

function boostCost() {
  return Math.floor(120 + state.power * 38);
}

function league() {
  if (state.total >= 10000) return "Mythic";
  if (state.total >= 5000) return "Diamond";
  if (state.total >= 1800) return "Gold";
  if (state.total >= 600) return "Silver";
  return "Bronze";
}

function tap(event) {
  const gain = clickPower();
  state.coins += gain;
  state.total += gain;
  spawnFloat(`+${gain}`, event?.clientX, event?.clientY);
  tg?.HapticFeedback?.impactOccurred?.("light");
  save();
  render();
}

function upgrade() {
  const cost = upgradeCost();
  if (state.coins < cost) return flashStatus("Не хватает монет на улучшение.");
  state.coins -= cost;
  state.power += 1;
  tg?.HapticFeedback?.notificationOccurred?.("success");
  save();
  render();
}

function boost() {
  const cost = boostCost();
  if (state.coins < cost) return flashStatus("Не хватает монет на буст.");
  state.coins -= cost;
  state.boostUntil = Date.now() + 30000;
  tg?.HapticFeedback?.notificationOccurred?.("success");
  save();
  render();
}

function sync() {
  save();
  const payload = JSON.stringify({ type: "score", score: state.total, power: state.power });
  try {
    tg?.sendData?.(payload);
    flashStatus("Результат отправлен боту, если Web App открыт из Telegram.");
  } catch {
    flashStatus("Локальный режим: результат сохранён в браузере.");
  }
}

function upsertScore() {
  const next = board.filter((row) => row.id !== player.id);
  next.push({ id: player.id, name: player.name, score: state.total });
  board = next.sort((a, b) => b.score - a.score).slice(0, 10);
}

function render() {
  els.coins.textContent = Math.floor(state.coins).toLocaleString("ru-RU");
  els.power.textContent = clickPower().toLocaleString("ru-RU");
  els.league.textContent = league();
  els.upgradeCost.textContent = upgradeCost().toLocaleString("ru-RU");
  els.boostCost.textContent = boostCost().toLocaleString("ru-RU");
  els.leaderboard.innerHTML = board
    .map((row, index) => `<li><b>#${index + 1}</b><span>${escapeHtml(row.name)}</span><strong>${Math.floor(row.score).toLocaleString("ru-RU")}</strong></li>`)
    .join("");
}

function spawnFloat(text, x = window.innerWidth / 2, y = window.innerHeight / 2) {
  const node = document.createElement("span");
  node.className = "float";
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.body.append(node);
  node.addEventListener("animationend", () => node.remove());
}

function flashStatus(text) {
  els.status.textContent = text;
  setTimeout(() => {
    els.status.textContent = "Тапай, прокачивай силу и забирай место в лидерборде.";
  }, 1800);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

els.tap.addEventListener("pointerdown", tap);
els.tap.addEventListener("click", (event) => {
  if (event.pointerType) return;
  tap(event);
});
els.upgrade.addEventListener("click", upgrade);
els.boost.addEventListener("click", boost);
els.sync.addEventListener("click", sync);

save();
render();
