const $ = (selector) => document.querySelector(selector);

const TOTAL_ROUNDS = 5;
const MAX_ROUND_SCORE = 1000;
const CLUE_PENALTIES = [0, 150, 300];
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 500;

const elements = {
  game: $("#gameCard"),
  start: $("#startScreen"),
  end: $("#endScreen"),
  startButton: $("#startButton"),
  playAgainButton: $("#playAgainButton"),
  shareButton: $("#shareButton"),
  map: $("#worldMap"),
  mapWrap: $("#mapWrap"),
  mapHint: $("#mapHint"),
  guessMarker: $("#guessMarker"),
  targetMarker: $("#targetMarker"),
  answerLine: $("#answerLine"),
  resultLine: $("#resultLine"),
  submitButton: $("#submitButton"),
  nextButton: $("#nextButton"),
  revealButton: $("#revealButton"),
  clueText: $("#clueText"),
  clueNumber: $("#clueNumber"),
  clueCost: $("#clueCost"),
  clueDots: $("#clueDots"),
  roundTitle: $("#roundTitle"),
  progressFill: $("#progressFill"),
  score: $("#score"),
  selectionStatus: $("#selectionStatus"),
  resultPanel: $("#resultPanel"),
  answerName: $("#answerName"),
  answerFact: $("#answerFact"),
  distanceResult: $("#distanceResult"),
  pointsResult: $("#pointsResult"),
  finalScore: $("#finalScore"),
  rankMessage: $("#rankMessage"),
  roundSummary: $("#roundSummary"),
  bestScoreText: $("#bestScoreText"),
  howToButton: $("#howToButton"),
  howToDialog: $("#howToDialog"),
  closeDialogButton: $("#closeDialogButton"),
  soundButton: $("#soundButton")
};

const state = {
  locations: [],
  round: 0,
  clueIndex: 0,
  guess: null,
  score: 0,
  results: [],
  locked: false,
  muted: false,
  audioContext: null
};

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function lonLatToPoint(lon, lat) {
  return {
    x: ((lon + 180) / 360) * SVG_WIDTH,
    y: ((90 - lat) / 180) * SVG_HEIGHT
  };
}

function pointToLonLat(x, y) {
  return {
    lon: (x / SVG_WIDTH) * 360 - 180,
    lat: 90 - (y / SVG_HEIGHT) * 180
  };
}

function pointerToSvg(event) {
  const point = elements.map.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(elements.map.getScreenCTM().inverse());
  return {
    x: Math.max(0, Math.min(SVG_WIDTH, transformed.x)),
    y: Math.max(0, Math.min(SVG_HEIGHT, transformed.y))
  };
}

function haversine(a, b) {
  const radius = 6371;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = radians(b.lat - a.lat);
  const deltaLon = radians(b.lon - a.lon);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function playTone(frequency, duration = 0.08, type = "sine") {
  if (state.muted) return;
  try {
    state.audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, state.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(state.audioContext.destination);
    oscillator.start();
    oscillator.stop(state.audioContext.currentTime + duration);
  } catch {
    // Sound is a small enhancement; gameplay continues if audio is unavailable.
  }
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("en-GB");
}

function updateBestScoreText() {
  const best = Number(localStorage.getItem("coordinate-zero-best") || 0);
  elements.bestScoreText.textContent = best ? `Personal best ${formatNumber(best)}` : "Personal best —";
}

function resetMarkers() {
  elements.guessMarker.hidden = true;
  elements.targetMarker.hidden = true;
  elements.answerLine.hidden = true;
  elements.mapHint.hidden = false;
}

function renderClue() {
  const location = state.locations[state.round];
  elements.clueText.classList.remove("clue-enter");
  void elements.clueText.offsetWidth;
  elements.clueText.textContent = location.clues[state.clueIndex];
  elements.clueText.classList.add("clue-enter");
  elements.clueNumber.textContent = `Clue ${String(state.clueIndex + 1).padStart(2, "0")}`;
  const available = MAX_ROUND_SCORE - CLUE_PENALTIES[state.clueIndex];
  elements.clueCost.textContent = `Worth up to ${formatNumber(available)} pts`;
  elements.clueDots.innerHTML = location.clues
    .map((_, index) => `<span class="${index <= state.clueIndex ? "active" : ""}"></span>`)
    .join("");
  elements.revealButton.hidden = state.clueIndex >= location.clues.length - 1;
}

function renderRound() {
  state.guess = null;
  state.clueIndex = 0;
  state.locked = false;
  elements.roundTitle.textContent = `Round ${state.round + 1} of ${TOTAL_ROUNDS}`;
  elements.progressFill.style.width = `${((state.round + 1) / TOTAL_ROUNDS) * 100}%`;
  elements.score.textContent = formatNumber(state.score);
  elements.submitButton.disabled = true;
  elements.submitButton.hidden = false;
  elements.nextButton.hidden = true;
  elements.resultPanel.hidden = true;
  elements.selectionStatus.textContent = "Click anywhere on the map to make your guess.";
  elements.selectionStatus.hidden = false;
  resetMarkers();
  renderClue();
  elements.map.focus({ preventScroll: true });
}

function startGame() {
  state.locations = shuffle(window.LOCATIONS).slice(0, TOTAL_ROUNDS);
  state.round = 0;
  state.score = 0;
  state.results = [];
  elements.start.hidden = true;
  elements.end.hidden = true;
  elements.game.hidden = false;
  renderRound();
  playTone(440, 0.1);
}

function placeGuess(point) {
  if (state.locked) return;
  state.guess = pointToLonLat(point.x, point.y);
  elements.guessMarker.setAttribute("transform", `translate(${point.x} ${point.y})`);
  elements.guessMarker.hidden = false;
  elements.mapHint.hidden = true;
  elements.submitButton.disabled = false;
  const latLabel = `${Math.abs(state.guess.lat).toFixed(1)}°${state.guess.lat >= 0 ? "N" : "S"}`;
  const lonLabel = `${Math.abs(state.guess.lon).toFixed(1)}°${state.guess.lon >= 0 ? "E" : "W"}`;
  elements.selectionStatus.textContent = `Pin at ${latLabel}, ${lonLabel}`;
  playTone(220, 0.05, "triangle");
}

function submitGuess() {
  if (!state.guess || state.locked) return;
  state.locked = true;
  const location = state.locations[state.round];
  const targetPoint = lonLatToPoint(location.lon, location.lat);
  const guessPoint = lonLatToPoint(state.guess.lon, state.guess.lat);
  const distance = Math.round(haversine(state.guess, location));
  const distanceScore = Math.round(1000 * Math.exp(-distance / 2200));
  const points = Math.max(0, distanceScore - CLUE_PENALTIES[state.clueIndex]);

  state.score += points;
  state.results.push({ name: location.name, distance, points, clues: state.clueIndex + 1 });

  elements.targetMarker.setAttribute("transform", `translate(${targetPoint.x} ${targetPoint.y})`);
  elements.targetMarker.hidden = false;
  elements.resultLine.setAttribute("x1", guessPoint.x);
  elements.resultLine.setAttribute("y1", guessPoint.y);
  elements.resultLine.setAttribute("x2", targetPoint.x);
  elements.resultLine.setAttribute("y2", targetPoint.y);
  elements.answerLine.hidden = false;
  elements.answerName.textContent = location.name;
  elements.answerFact.textContent = location.fact;
  elements.distanceResult.textContent = `${formatNumber(distance)} km`;
  elements.pointsResult.textContent = `+${formatNumber(points)}`;
  elements.resultPanel.hidden = false;
  elements.score.textContent = formatNumber(state.score);
  elements.submitButton.hidden = true;
  elements.nextButton.hidden = false;
  elements.nextButton.textContent = state.round === TOTAL_ROUNDS - 1 ? "See final score" : "Next location";
  elements.selectionStatus.hidden = true;
  elements.revealButton.hidden = true;
  playTone(points >= 700 ? 660 : points >= 350 ? 420 : 260, 0.18, "sine");
}

function rankForScore(score) {
  if (score >= 4500) return "Cartographer. The atlas has nothing left to teach you.";
  if (score >= 3500) return "Pathfinder. You know which way the world turns.";
  if (score >= 2500) return "Navigator. A few borders blurred, but you found your way.";
  if (score >= 1500) return "Wanderer. Lost occasionally — which is half the fun.";
  return "Drifter. The compass was more of a suggestion today.";
}

function showEndScreen() {
  elements.game.hidden = true;
  elements.end.hidden = false;
  elements.finalScore.textContent = formatNumber(state.score);
  elements.rankMessage.textContent = rankForScore(state.score);
  elements.roundSummary.innerHTML = state.results
    .map(
      (result, index) => `
        <article>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <div><strong>${result.name}</strong><small>${formatNumber(result.distance)} km away · ${result.clues} clue${result.clues === 1 ? "" : "s"}</small></div>
          <b>${formatNumber(result.points)}</b>
        </article>`
    )
    .join("");

  const best = Number(localStorage.getItem("coordinate-zero-best") || 0);
  if (state.score > best) localStorage.setItem("coordinate-zero-best", String(state.score));
  updateBestScoreText();
  playTone(523, 0.12);
  window.setTimeout(() => playTone(659, 0.12), 120);
  window.setTimeout(() => playTone(784, 0.2), 240);
}

function nextRound() {
  if (state.round === TOTAL_ROUNDS - 1) {
    showEndScreen();
    return;
  }
  state.round += 1;
  renderRound();
}

async function shareResult() {
  const blocks = state.results.map((result) => {
    if (result.points >= 800) return "🟩";
    if (result.points >= 500) return "🟨";
    if (result.points >= 250) return "🟧";
    return "⬛";
  }).join("");
  const text = `Coordinate Zero — ${formatNumber(state.score)}/5,000\n${blocks}\n${window.location.href}`;
  try {
    await navigator.clipboard.writeText(text);
    elements.shareButton.textContent = "Copied!";
    window.setTimeout(() => { elements.shareButton.textContent = "Copy result"; }, 1800);
  } catch {
    elements.shareButton.textContent = "Copy unavailable";
  }
}

elements.map.addEventListener("click", (event) => placeGuess(pointerToSvg(event)));
elements.map.addEventListener("keydown", (event) => {
  if (state.locked) return;
  const step = event.shiftKey ? 25 : 8;
  let current = state.guess ? lonLatToPoint(state.guess.lon, state.guess.lat) : { x: 500, y: 250 };
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "ArrowLeft") current.x -= step;
    if (event.key === "ArrowRight") current.x += step;
    if (event.key === "ArrowUp") current.y -= step;
    if (event.key === "ArrowDown") current.y += step;
    current.x = Math.max(0, Math.min(SVG_WIDTH, current.x));
    current.y = Math.max(0, Math.min(SVG_HEIGHT, current.y));
    placeGuess(current);
  }
  if (event.key === "Enter") submitGuess();
});

elements.revealButton.addEventListener("click", () => {
  state.clueIndex += 1;
  renderClue();
  playTone(330, 0.06);
});
elements.submitButton.addEventListener("click", submitGuess);
elements.nextButton.addEventListener("click", nextRound);
elements.startButton.addEventListener("click", startGame);
elements.playAgainButton.addEventListener("click", startGame);
elements.shareButton.addEventListener("click", shareResult);
elements.howToButton.addEventListener("click", () => elements.howToDialog.showModal());
elements.closeDialogButton.addEventListener("click", () => elements.howToDialog.close());
elements.howToDialog.addEventListener("click", (event) => {
  if (event.target === elements.howToDialog) elements.howToDialog.close();
});
elements.soundButton.addEventListener("click", () => {
  state.muted = !state.muted;
  elements.soundButton.setAttribute("aria-pressed", String(state.muted));
  elements.soundButton.setAttribute("aria-label", state.muted ? "Enable sounds" : "Mute sounds");
  elements.soundButton.textContent = state.muted ? "○" : "◖";
  if (!state.muted) playTone(440, 0.07);
});

elements.game.hidden = true;
updateBestScoreText();
