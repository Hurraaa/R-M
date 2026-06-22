import { Game } from "./game/Game.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);

// DOM referansları
const startScreen = document.getElementById("start-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const hud = document.getElementById("hud");
const healthFill = document.getElementById("health-fill");
const scoreEl = document.getElementById("score");
const finalScore = document.getElementById("final-score");
const waveInfo = document.getElementById("wave-info");
const loading = document.getElementById("loading");

// HUD güncellemeleri
game._onHud = () => {
  healthFill.style.width = Math.max(0, game.player.health) + "%";
  scoreEl.textContent = game.score;
};
game._onWave = (w) => {
  waveInfo.textContent = "DALGA " + w;
  waveInfo.style.animation = "none";
  waveInfo.offsetHeight; // reflow
  waveInfo.style.animation = "flicker 0.5s 3";
};
game._onGameOver = (score) => {
  finalScore.textContent = score;
  hud.classList.add("hidden");
  gameoverScreen.classList.remove("hidden");
};

function beginGame() {
  startScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  game.start();
  game._onHud();
}

document.getElementById("start-btn").addEventListener("click", beginGame);
document.getElementById("restart-btn").addEventListener("click", beginGame);

// ilk kare çizildiğinde yükleniyor ekranını kaldır
requestAnimationFrame(() => {
  setTimeout(() => loading.classList.add("hidden"), 300);
});
