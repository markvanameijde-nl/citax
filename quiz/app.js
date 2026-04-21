/* -------------------------------------------------------------
   Quiz app — vanilla JS
   - Loads questions.json
   - Picks random questions across categories
   - Web Speech API (SpeechSynthesis) reads question + options
     with an enthusiastic Dutch quizmaster voice (slightly
     higher rate and pitch)
   - Green/red flash + speech feedback per answer
   - Score persists via localStorage
   ------------------------------------------------------------- */

"use strict";

/* ---------- Constants ---------- */

const STORAGE_KEY = "citax-quiz-score-v1";
const RATE_STORAGE_KEY = "citax-quiz-rate-v1";
const OPTION_LETTERS = ["A", "B", "C", "D"];

// Enthusiastic quizmaster prosody. Pitch stays fixed; rate is
// user-configurable via the slider (persisted in localStorage).
const VOICE_LANG = "nl-NL";
const VOICE_PITCH = 1.2;
const VOICE_RATE_DEFAULT = 1.0;
const VOICE_RATE_MIN = 0.7;
const VOICE_RATE_MAX = 1.4;

/* ---------- DOM refs ---------- */

const els = {
  categoryBadge: document.getElementById("category-badge"),
  questionText: document.getElementById("question-text"),
  options: document.getElementById("options"),
  scoreCorrect: document.getElementById("score-correct"),
  scoreWrong: document.getElementById("score-wrong"),
  scoreTotal: document.getElementById("score-total"),
  btnNext: document.getElementById("btn-next"),
  btnReset: document.getElementById("btn-reset"),
  flash: document.getElementById("flash"),
  questionCard: document.getElementById("question-card"),
  rate: document.getElementById("rate"),
  rateValue: document.getElementById("rate-value"),
};

/* ---------- State ---------- */

const state = {
  questions: [],
  current: null,
  answered: false,
  score: loadScore(),
  rate: loadRate(),
};

/* ---------- Score persistence ---------- */

function loadScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { correct: 0, wrong: 0 };
    const parsed = JSON.parse(raw);
    return {
      correct: Number(parsed.correct) || 0,
      wrong: Number(parsed.wrong) || 0,
    };
  } catch {
    return { correct: 0, wrong: 0 };
  }
}

function saveScore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.score));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function renderScore() {
  const { correct, wrong } = state.score;
  els.scoreCorrect.textContent = String(correct);
  els.scoreWrong.textContent = String(wrong);
  els.scoreTotal.textContent = String(correct + wrong);
}

/* ---------- Speech rate persistence ---------- */

function clampRate(n) {
  if (!Number.isFinite(n)) return VOICE_RATE_DEFAULT;
  return Math.min(VOICE_RATE_MAX, Math.max(VOICE_RATE_MIN, n));
}

function loadRate() {
  try {
    const raw = localStorage.getItem(RATE_STORAGE_KEY);
    if (raw == null) return VOICE_RATE_DEFAULT;
    return clampRate(parseFloat(raw));
  } catch {
    return VOICE_RATE_DEFAULT;
  }
}

function saveRate() {
  try {
    localStorage.setItem(RATE_STORAGE_KEY, String(state.rate));
  } catch {
    /* ignore */
  }
}

function renderRate() {
  // Sync both the slider and the numeric display to state.rate.
  // Use this on initial load / when state changes outside the slider.
  els.rate.value = String(state.rate);
  renderRateLabel();
}

function renderRateLabel() {
  els.rateValue.textContent = `${state.rate.toFixed(2).replace(/0$/, "")}×`;
}

/* ---------- Speech ---------- */

let cachedVoice = null;

function pickDutchVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Prefer exact nl-NL, then any nl-*, then anything whose name hints
  // at Dutch. Falls back to null (browser default).
  const exact = voices.find((v) => v.lang === VOICE_LANG);
  if (exact) return exact;
  const anyNl = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("nl"));
  if (anyNl) return anyNl;
  const byName = voices.find((v) => /dutch|nederland/i.test(v.name));
  return byName || null;
}

function speak(text, { interrupt = true } = {}) {
  if (!("speechSynthesis" in window)) return;
  if (!text) return;

  if (interrupt) window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG;
  u.rate = state.rate;
  u.pitch = VOICE_PITCH;

  if (!cachedVoice) cachedVoice = pickDutchVoice();
  if (cachedVoice) u.voice = cachedVoice;

  window.speechSynthesis.speak(u);
}

// Voices load asynchronously in some browsers (notably Chrome).
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = pickDutchVoice();
  };
}

/* ---------- Flash feedback ---------- */

let flashTimer = null;

function flash(kind) {
  els.flash.classList.remove("flash-correct", "flash-wrong");
  // Force reflow so the animation restarts if called twice quickly.
  // eslint-disable-next-line no-unused-expressions
  els.flash.offsetWidth;
  els.flash.classList.add(kind === "correct" ? "flash-correct" : "flash-wrong");

  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    els.flash.classList.remove("flash-correct", "flash-wrong");
  }, 650);
}

/* ---------- Quiz flow ---------- */

function pickRandomQuestion() {
  if (!state.questions.length) return null;
  // Avoid immediately repeating the previous question when possible.
  const prev = state.current;
  let pick = state.questions[Math.floor(Math.random() * state.questions.length)];
  if (prev && state.questions.length > 1) {
    let guard = 0;
    while (pick === prev && guard < 10) {
      pick = state.questions[Math.floor(Math.random() * state.questions.length)];
      guard++;
    }
  }
  return pick;
}

function renderQuestion(q) {
  state.current = q;
  state.answered = false;

  els.categoryBadge.textContent = q.category;
  els.questionText.textContent = q.question;

  // Re-trigger the entrance animation.
  els.questionCard.style.animation = "none";
  // eslint-disable-next-line no-unused-expressions
  els.questionCard.offsetWidth;
  els.questionCard.style.animation = "";

  els.options.innerHTML = "";
  q.options.forEach((text, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.setAttribute("role", "listitem");
    btn.dataset.index = String(idx);
    btn.innerHTML =
      `<span class="option-letter">${OPTION_LETTERS[idx]}</span>` +
      `<span class="option-text"></span>`;
    // Use textContent to avoid any HTML injection from the JSON.
    btn.querySelector(".option-text").textContent = text;
    btn.addEventListener("click", () => onAnswer(idx, btn));
    els.options.appendChild(btn);
  });

  els.btnNext.textContent = "Volgende vraag";

  // Read the question + options aloud.
  const spoken =
    `${q.question}. ` +
    q.options.map((t, i) => `${OPTION_LETTERS[i]}: ${t}.`).join(" ");
  speak(spoken);
}

function onAnswer(chosenIdx, btn) {
  if (state.answered) return;
  state.answered = true;

  const q = state.current;
  const correctIdx = q.answer;
  const isCorrect = chosenIdx === correctIdx;

  // Highlight all options: correct green, chosen wrong red, others dim.
  const all = els.options.querySelectorAll(".option");
  all.forEach((el) => {
    el.disabled = true;
    const i = Number(el.dataset.index);
    if (i === correctIdx) el.classList.add("is-correct");
    else if (i === chosenIdx) el.classList.add("is-wrong");
    else el.classList.add("is-dim");
  });

  if (isCorrect) {
    state.score.correct += 1;
    flash("correct");
    speak("Helemaal goed!");
  } else {
    state.score.wrong += 1;
    flash("wrong");
    speak(`Helaas, het juiste antwoord was ${q.options[correctIdx]}.`);
  }

  saveScore();
  renderScore();
}

function nextQuestion() {
  const q = pickRandomQuestion();
  if (!q) {
    els.questionText.textContent = "Geen vragen beschikbaar.";
    return;
  }
  renderQuestion(q);
}

function resetScore() {
  state.score = { correct: 0, wrong: 0 };
  saveScore();
  renderScore();
  speak("Score gereset. Daar gaan we weer!");
}

/* ---------- Boot ---------- */

async function loadQuestions() {
  const res = await fetch("questions.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Kon questions.json niet laden (${res.status})`);
  const data = await res.json();
  if (!data || !Array.isArray(data.questions) || !data.questions.length) {
    throw new Error("questions.json bevat geen vragen");
  }
  return data.questions;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // When a new SW takes control (e.g. after a deploy), reload once so the
  // page starts running the freshly-cached JS/CSS instead of the stale copy
  // the previous SW was still serving. Guarded so we only reload a single
  // time per session.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  // Register once the page is fully loaded so it doesn't block initial render.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* swallow — app still works without offline support */
    });
  });
}

function bindControls() {
  els.btnNext.addEventListener("click", nextQuestion);
  els.btnReset.addEventListener("click", () => {
    if (confirm("Score resetten?")) resetScore();
  });

  // Live-update speech rate while the user drags the slider.
  // We deliberately do NOT write back to els.rate.value here — doing so
  // can make the thumb jump during drag on some mobile browsers.
  els.rate.addEventListener("input", () => {
    state.rate = clampRate(parseFloat(els.rate.value));
    renderRateLabel();
  });
  // Persist + demo the new rate once the user lets go.
  els.rate.addEventListener("change", () => {
    saveRate();
    speak("Zo klinkt het.");
  });

  // Stop speech when the user leaves/hides the page.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  });
}

async function init() {
  renderScore();
  renderRate();
  bindControls();
  registerServiceWorker();

  try {
    state.questions = await loadQuestions();
    nextQuestion();
  } catch (err) {
    console.error(err);
    els.questionText.textContent =
      "Kon vragen niet laden. Probeer de pagina te verversen.";
    els.options.innerHTML = "";
  }
}

init();
