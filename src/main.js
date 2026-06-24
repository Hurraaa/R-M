import { PortalGame } from "./portal/PortalGame.js";

const canvas = document.getElementById("game");
const game = new PortalGame(canvas);

const startScreen = document.getElementById("start-screen");
const winScreen = document.getElementById("win-screen");
const hud = document.getElementById("hud");
const chamberInfo = document.getElementById("chamber-info");
const objective = document.getElementById("objective");
const hint = document.getElementById("hint");
const winStory = document.getElementById("win-story");
const toast = document.getElementById("toast");
const loading = document.getElementById("loading");

let toastTimer = null;
function showToast(msg, ms = 1600) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
}

game._onHud = (n, total, hintText, objectiveText) => {
  chamberInfo.textContent = `ODA ${n} / ${total}`;
  objective.textContent = objectiveText ? "🎯 " + objectiveText : "";
  hint.textContent = hintText || "";
  hint.classList.add("hidden"); // her odada ipucu gizli — oyuncu kendi keşfeder
};
game._onChamberClear = (next, story) => showToast(story || `Oda ${next}`, 3200);
game._onDeny = () => showToast("Bu yüzeye portal açılamaz", 900);
game._onWin = (story) => {
  if (winStory && story) winStory.textContent = story;
  hud.classList.add("hidden");
  winScreen.classList.remove("hidden");
};

function begin() {
  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  game.start();
}

document.getElementById("start-btn").addEventListener("click", begin);
document.getElementById("again-btn").addEventListener("click", begin);
document.getElementById("reset-btn").addEventListener("click", () => game.loadChamber(game.chamberIndex));
document.getElementById("hint-btn").addEventListener("click", () => hint.classList.toggle("hidden"));

// pointer-lock koparsa (ESC) başlangıca dönmeden devam; tekrar kilitlemek için tıkla
canvas.addEventListener("click", () => {
  if (game.state === "playing" && !game.input.isTouch && !game.input.locked) game.input.lock();
});

// ---- Ayarlar (hassasiyet) ----
const settingsScreen = document.getElementById("settings-screen");
const sensXEl = document.getElementById("sens-x");
const sensYEl = document.getElementById("sens-y");
const invertYEl = document.getElementById("invert-y");
const sxVal = document.getElementById("sx-val");
const syVal = document.getElementById("sy-val");

const num = (v, d) => (isNaN(parseFloat(v)) ? d : parseFloat(v));
const cfg = {
  sx: num(localStorage.getItem("pl_sx"), 1),
  sy: num(localStorage.getItem("pl_sy"), 1),
  inv: localStorage.getItem("pl_inv") === "1",
};

function applyCfg() {
  game.controller.sensXMul = cfg.sx;
  game.controller.sensYMul = cfg.sy;
  game.controller.invertY = cfg.inv;
  sensXEl.value = cfg.sx;
  sensYEl.value = cfg.sy;
  invertYEl.checked = cfg.inv;
  sxVal.textContent = cfg.sx.toFixed(1) + "×";
  syVal.textContent = cfg.sy.toFixed(1) + "×";
}
applyCfg();

sensXEl.addEventListener("input", () => {
  cfg.sx = parseFloat(sensXEl.value);
  localStorage.setItem("pl_sx", cfg.sx);
  applyCfg();
});
sensYEl.addEventListener("input", () => {
  cfg.sy = parseFloat(sensYEl.value);
  localStorage.setItem("pl_sy", cfg.sy);
  applyCfg();
});
invertYEl.addEventListener("change", () => {
  cfg.inv = invertYEl.checked;
  localStorage.setItem("pl_inv", cfg.inv ? "1" : "0");
  applyCfg();
});

function openSettings() {
  settingsScreen.classList.remove("hidden");
  document.exitPointerLock?.();
}
function closeSettings() {
  settingsScreen.classList.add("hidden");
  if (game.state === "playing" && !game.input.isTouch) game.input.lock();
}
document.getElementById("settings-btn").addEventListener("click", openSettings);
document.getElementById("open-settings-btn").addEventListener("click", openSettings);
document.getElementById("settings-close").addEventListener("click", closeSettings);
document.getElementById("settings-reset").addEventListener("click", () => {
  cfg.sx = 1;
  cfg.sy = 1;
  cfg.inv = false;
  localStorage.setItem("pl_sx", "1");
  localStorage.setItem("pl_sy", "1");
  localStorage.setItem("pl_inv", "0");
  applyCfg();
});

requestAnimationFrame(() => setTimeout(() => loading.classList.add("hidden"), 300));
