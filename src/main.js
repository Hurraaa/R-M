import { PortalGame } from "./portal/PortalGame.js";
import { CHAMBER_COUNT } from "./portal/Level.js";

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

function begin(index = 0) {
  startScreen.classList.add("hidden");
  winScreen.classList.add("hidden");
  selectScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  game.start(index);
}

document.getElementById("start-btn").addEventListener("click", () => begin(0));
document.getElementById("again-btn").addEventListener("click", () => begin(0));

// ---- Bölüm seç (test modu) ----
const selectScreen = document.getElementById("select-screen");
const selectGrid = document.getElementById("select-grid");
const CH_NAMES = ["Uyanış", "Yön", "Kontrol", "Ağırlık", "Çifte Yük", "Köprü", "İp Hattı", "Trambolin", "Enerji Topu", "Dönen Merdivenler", "İnce Köprü", "Şifre", "Çarklar ve Su", "Ay Yürüyüşü", "Yer Çekimi", "Sütun Patlatma", "Füze", "Engel Yağmuru", "Serbest Düşüş", "Işık Köprüsü", "Sıçrama Hattı", "Lazer", "Şebeke", "Yansıtıcı", "Sıçrama Jeli", "Mantık Kapısı", "Çift Yansıtıcı", "Yukarı Işın", "Hız Kilidi", "Yankı", "Çift Yankı", "Portal Yankısı", "Yankı Zinciri", "Yankı ve Işın", "Yankı Sıçraması", "Trambolin Kulesi"];
for (let i = 0; i < CHAMBER_COUNT; i++) {
  const b = document.createElement("button");
  b.className = "select-cell";
  b.innerHTML = `<span class="cn">${i + 1}</span><span class="ct">${CH_NAMES[i] || ""}</span>`;
  b.addEventListener("click", () => begin(i));
  selectGrid.appendChild(b);
}
document.getElementById("select-btn").addEventListener("click", () => {
  startScreen.classList.add("hidden");
  selectScreen.classList.remove("hidden");
});
document.getElementById("select-close").addEventListener("click", () => {
  selectScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});
document.getElementById("reset-btn").addEventListener("click", () => game.loadChamber(game.chamberIndex));
document.getElementById("hint-btn").addEventListener("click", () => hint.classList.toggle("hidden"));
document.getElementById("perf-btn").addEventListener("click", () => game.perf.toggle());

// ---- Yankı (zaman yankısı) düğmesi + gösterge ----
const echoBtn = document.getElementById("echo-btn");
echoBtn.addEventListener("click", () => game.toggleEcho());
game._onEcho = (recording, echoMax) => {
  if (echoMax > 0) echoBtn.classList.remove("hidden");
  else echoBtn.classList.add("hidden");
  echoBtn.textContent = recording ? "⏺ KAYIT" : "⏱ YANKI";
  echoBtn.classList.toggle("recording", recording);
};

// ---- Küp tut/bırak (✊ düğmesi + F tuşu) ----
const grabBtn = document.getElementById("btn-grab");
grabBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  game.toggleGrab();
  grabBtn.classList.toggle("holding", !!game.heldCube);
});

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
