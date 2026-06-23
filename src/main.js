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

requestAnimationFrame(() => setTimeout(() => loading.classList.add("hidden"), 300));
