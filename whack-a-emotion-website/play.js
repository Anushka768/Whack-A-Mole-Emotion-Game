// to fix mobile landscape view
function setViewportHeight() {
  const vh = window.innerHeight;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

setViewportHeight();
window.addEventListener("resize", setViewportHeight);

// Standalone demo mode: play each GIF scene once over a 30-second window.
const scenes = document.querySelectorAll(".scene");
const movie = document.getElementById("movie");
// A unique URL makes the browser decode each non-looping GIF from frame one per round.
const playSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
// Per-scene one-play durations, in the same order as the images in play.html.
const SCENE_DURATIONS = [
  1260, 1680, 3120, 2160, 1800, 2160, 2640,
  3120, 2360, 1980, 1800, 3240, 2160, 520
];
const PLAY_DURATION = SCENE_DURATIONS.reduce((total, duration) => total + duration, 0);
const POINTS_PER_HIT = 1;
// Difficulty controls both target count and reaction time.
const difficulty = localStorage.getItem("difficulty") === "HARD" ? "HARD" : "EASY";
// The target is reachable in either mode within the fixed 30-second round.
const SCORE_TO_WIN = difficulty === "HARD" ? 20 : 10;
const BALL_VISIBLE_MS = difficulty === "HARD" ? 1800 : 2000;
const NEXT_WAVE_DELAY_MS = difficulty === "HARD" ? 600 : 750;

let currentScene = 0;
let playFinished = false;
let score = 0;
let previousHole = -1;
const activeHoles = new Set();
const ballTimeouts = new Map();
let nextBallTimeout;

const ballTargets = [...document.querySelectorAll(".ball-target")];
const scoreValue = document.getElementById("score-value");
const scoreTarget = document.querySelector(".score-target");
const difficultyLabel = document.getElementById("difficulty-label");
const scorePanel = document.getElementById("whack-score");
const gameStatus = document.getElementById("game-status");

scoreTarget.textContent = `/ ${SCORE_TO_WIN}`;
difficultyLabel.textContent = difficulty;

/* Previous self-reported result picker, retained but disabled for the live game:
function showOutcomePrompt() {
  const prompt = document.createElement("section");
  prompt.id = "outcome-prompt";
  prompt.setAttribute("role", "region");
  prompt.setAttribute("aria-labelledby", "outcome-title");
  prompt.innerHTML = `
    <div class="outcome-panel">
      <h1 id="outcome-title">Your result?</h1>
      <div class="outcome-options">
        <button type="button" data-state="WIN">Winning</button>
        <button type="button" data-state="LOSE">Losing</button>
      </div>
    </div>
  `;
  movie.appendChild(prompt);
}

function chooseOutcome(state) {
  if (selectedOutcome || playFinished) return;
  selectedOutcome = STATES[state];
}
*/

function activateScene(index) {
  const scene = scenes[index];
  // Assign the GIF only when it starts so hidden animations cannot run early.
  if (!scene.getAttribute("src")) {
    const source = new URL(scene.dataset.src, document.baseURI);
    source.searchParams.set("round", playSessionId);
    scene.setAttribute("src", source.href);
  }
  scene.classList.add("active");
}

// If the browser revives an old Play document from its navigation cache, start a clean round.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});

function clearBall(index) {
  const target = ballTargets[index];
  if (!target) return;

  target.classList.remove("ball-active");
  target.setAttribute("aria-label", `Ball target ${index + 1}, empty`);
  target.setAttribute("aria-pressed", "false");
  activeHoles.delete(index);
  clearTimeout(ballTimeouts.get(index));
  ballTimeouts.delete(index);
}

function scheduleNextWave() {
  if (playFinished || activeHoles.size > 0 || nextBallTimeout) return;
  nextBallTimeout = setTimeout(() => {
    nextBallTimeout = undefined;
    showRandomBalls();
  }, NEXT_WAVE_DELAY_MS);
}

function showRandomBalls() {
  if (playFinished || ballTargets.length === 0) return;

  const possibleTargets = ballTargets
    .map((_, index) => index)
    .filter((index) => index !== previousHole);

  if (possibleTargets.length === 0) {
    possibleTargets.push(...ballTargets.map((_, index) => index));
  }

  // Easy presents one target. Hard presents a random pair or trio each wave.
  const groupSize = difficulty === "HARD"
    ? Math.min(2 + Math.floor(Math.random() * 2), possibleTargets.length)
    : 1;
  const chosenTargets = [];

  while (chosenTargets.length < groupSize && possibleTargets.length > 0) {
    const randomIndex = Math.floor(Math.random() * possibleTargets.length);
    chosenTargets.push(possibleTargets.splice(randomIndex, 1)[0]);
  }

  chosenTargets.forEach((targetIndex) => {
    previousHole = targetIndex;
    activeHoles.add(targetIndex);

    const target = ballTargets[targetIndex];
    target.classList.add("ball-active");
    target.setAttribute("aria-label", `Color ball in target ${targetIndex + 1}`);
    target.setAttribute("aria-pressed", "true");

    ballTimeouts.set(targetIndex, setTimeout(() => {
      if (!activeHoles.has(targetIndex) || playFinished) return;
      clearBall(targetIndex);
      recordMiss();
      scheduleNextWave();
    }, BALL_VISIBLE_MS));
  });
}

function updateScore(change, message) {
  score = Math.max(0, score + change);
  scoreValue.textContent = String(score);
  gameStatus.textContent = `${message}. Score ${score}`;
  scorePanel.classList.toggle("score-target-reached", score >= SCORE_TO_WIN);
}

// An expired mole or a tap on an empty hole counts as one missed whack.
function recordMiss() {
  if (playFinished) return;
  updateScore(-1, "Missed");
}

function hitBallTarget(event) {
  if (playFinished) return;

  const targetIndex = Number(event.currentTarget.dataset.hole);
  if (!activeHoles.has(targetIndex)) {
    recordMiss();
    return;
  }

  // Each ball is independent, so hitting one leaves any other visible ball in play.
  clearBall(targetIndex);
  updateScore(POINTS_PER_HIT, "Hit");
  scheduleNextWave();
}

// Each button responds only while its randomly selected mole is visible.
ballTargets.forEach((target) => target.addEventListener("click", hitBallTarget));

function nextScene() {
  scenes[currentScene].classList.remove("active");

  if (currentScene >= scenes.length - 1) {
    finishPlay();
    return;
  }

  currentScene++;
  activateScene(currentScene);
  setTimeout(nextScene, SCENE_DURATIONS[currentScene]);
}

/* Previous result-based randomized score, retained but disabled for live play:
function saveLeaderboardEntry(result) {
  // Standalone demo mode: add one randomized score for each completed game.
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem("LEADERBOARD_ENTRIES") || "[]");
    if (!Array.isArray(entries)) entries = [];
  } catch (error) {
    entries = [];
  }

  const won = result === STATES.WIN;
  entries.push({
    name: localStorage.getItem("playerName") || "Guest",
    university: localStorage.getItem("playerUni") || "",
    difficulty: localStorage.getItem("difficulty") || "EASY",
    score: won ? 70 + Math.floor(Math.random() * 31) : Math.floor(Math.random() * 70),
    result,
    timestamp: Date.now()
  });
  localStorage.setItem("LEADERBOARD_ENTRIES", JSON.stringify(entries));
}
*/

function saveLeaderboardEntry(result, earnedScore) {
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem("LEADERBOARD_ENTRIES") || "[]");
    if (!Array.isArray(entries)) entries = [];
  } catch (error) {
    entries = [];
  }

  entries.push({
    name: localStorage.getItem("playerName") || "Guest",
    university: localStorage.getItem("playerUni") || "",
    difficulty: localStorage.getItem("difficulty") || "EASY",
    score: earnedScore,
    result,
    timestamp: Date.now()
  });
  localStorage.setItem("LEADERBOARD_ENTRIES", JSON.stringify(entries));
}

function finishPlay() {
  if (playFinished) return;
  playFinished = true;

  clearTimeout(nextBallTimeout);
  [...activeHoles].forEach(clearBall);

  // The final score, not a self-reported choice, determines the result.
  const result = score >= SCORE_TO_WIN ? STATES.WIN : STATES.LOSE;
  saveLeaderboardEntry(result, score);
  setState(result);
}

activateScene(currentScene);
showRandomBalls();
setTimeout(nextScene, SCENE_DURATIONS[currentScene]);

// ESP-triggered result handling retained for possible hardware integration:
// setState(STATES.RESULT);
// setInterval(nextScene, SCENE_DURATIONS[currentScene]);
