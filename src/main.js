import { PortalGame } from "./portal/PortalGame.js";

const canvas = document.getElementById("game");
const game = new PortalGame(canvas);

const startScreen = document.getElementById("start-screen");
const winScreen = document.getElementById("win-screen");
const hud = document.getElementById("hud");
const chamberInfo = document.getElementById("chamber-info");
const hint = document.getElementById("hint");
const toast = document.getElementById("toast");
const loading = document.getElementById("loading");

let toastTimer = null;
function showToast(msg, ms = 1600) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), ms);
}

game._onHud = (n, total, hintText) => {
  chamberInfo.textContent = `ODA ${n} / ${total}`;
  hint.textContent = hintText || "";
};
game._onChamberClear = (next) => showToast(`✓ Oda temizlendi — Oda ${next}`);
game._onDeny = () => showToast("Bu yüzeye portal açılamaz", 900);
game._onWin = () => {
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

// pointer-lock koparsa (ESC) başlangıca dönmeden devam; tekrar kilitlemek için tıkla
canvas.addEventListener("click", () => {
  if (game.state === "playing" && !game.input.isTouch && !game.input.locked) game.input.lock();
});

requestAnimationFrame(() => setTimeout(() => loading.classList.add("hidden"), 300));
