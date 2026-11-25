import {
  RESULT_LOADING_MS,
  countCorrectAnswers,
  elapsedQuizSeconds,
  formatClock,
  quizDurationSeconds,
  scorePercent,
  shouldConfirmQuizExit,
} from "./quiz-core.js";

const LV = {
  facile: ["Facile", "Les bases"],
  normal: ["Normal", "Pour les curieux"],
  difficile: ["Difficile", "Pour les étudiants"],
  expert: ["Expert", "Pour les pros"],
};

let cat = "tous";
let lv = "tous";
let NQ = 10;
let Q = [];
let i = 0;
let sc = 0;
let timerId = null;
let startedAt = 0;
let deadline = 0;
let totalSeconds = 0;
let finished = false;
let quizActive = false;
let pendingHref = null;
let lastFocus = null;

const show = (selector) => ["#intro", "#play", "#loading", "#end"].forEach((item) => ($(item).hidden = item !== selector));
const pool = () => QUIZ.filter((item) => (cat === "tous" || item.categorie === cat) && (lv === "tous" || item.niveau === lv));
const upd = () => { $("#go").disabled = !pool().length; };
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[char]));

$("#sp").innerHTML = '<option value="tous">Tous les animaux</option>' + uniq(QUIZ, (item) => item.categorie).sort(byOrd)
  .map((category) => `<option value="${category}">${CAT[category] || category}</option>`).join("");
$("#sp").onchange = (event) => { cat = event.target.value; upd(); };
// Arrivée depuis une fiche animal (animaux.html) : ?sp=<catégorie> présélectionne l’animal.
{ const sp = new URLSearchParams(location.search).get("sp"); if (sp && QUIZ.some((item) => item.categorie === sp)) { cat = sp; $("#sp").value = sp; } }

const radios = (element, items, current, callback) => {
  element.innerHTML = items.map(([value, label, sublabel]) => `<button type="button" role="radio" aria-checked="${value === current}" data-v="${value}"><b>${label}</b>${sublabel ? `<small>${sublabel}</small>` : ""}</button>`).join("");
  element.onclick = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    element.querySelectorAll("button").forEach((item) => item.setAttribute("aria-checked", item === button));
    callback(button.dataset.v);
  };
};

radios($("#lv"), [["tous", "Mélange", "Tous niveaux"], ...Object.entries(LV).map(([key, [label, sublabel]]) => [key, label, sublabel])], lv, (value) => { lv = value; upd(); });
radios($("#nb"), [["10", "10"], ["20", "20"]], "10", (value) => { NQ = Number(value); });
upd();

function stopTimer() {
  if (timerId !== null) window.clearInterval(timerId);
  timerId = null;
}

function renderTimer() {
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  $("#time").textContent = formatClock(remaining);
  $("#timer").classList.toggle("is-low", remaining <= 60);
  $("#timer").setAttribute("aria-label", `Temps restant : ${formatClock(remaining)}`);
  if (remaining <= 0) finish(true);
}

function startTimer() {
  totalSeconds = quizDurationSeconds(Q);
  startedAt = Date.now();
  deadline = startedAt + totalSeconds * 1000;
  renderTimer();
  timerId = window.setInterval(renderTimer, 250);
}

function start() {
  stopTimer();
  Q = sh(pool()).slice(0, NQ).map((item) => ({
    ...item,
    r: sh(item.reponses.map((text, index) => ({ t: text, ok: index === item.bonne }))),
  }));
  if (!Q.length) return;
  i = 0;
  sc = 0;
  finished = false;
  quizActive = true;
  show("#play");
  startTimer();
  ask();
  scrollTo({ top: 0, behavior: "smooth" });
}

$("#go").onclick = start;
$("#new").onclick = start;

function ask() {
  const question = Q[i];
  $("#bar").style.width = `${(i / Q.length) * 100}%`;
  $("#n").textContent = `${i + 1} / ${Q.length}`;
  $("#tag").textContent = `${CAT[question.categorie] || ""} · ${(LV[question.niveau] || [""])[0]}`;
  $("#qt").textContent = question.question;
  $("#fb").innerHTML = "";
  $("#nx").hidden = true;
  $("#ans").innerHTML = question.r.map((answer, index) => `<button class="ans" data-k="${index}" aria-pressed="false"><b>${"ABCD"[index]}</b><span>${esc(answer.t)}</span></button>`).join("");
}

$("#ans").onclick = (event) => {
  const button = event.target.closest(".ans");
  if (!button || finished) return;
  const question = Q[i];
  const answerIndex = Number(button.dataset.k);
  question.choice = answerIndex;
  [...$("#ans").children].forEach((item, index) => {
    const selected = index === answerIndex;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", selected);
  });
  $("#nx").hidden = false;
  $("#nx").textContent = i + 1 < Q.length ? "Question suivante" : "Voir mon score";
};

$("#nx").onclick = () => {
  if (finished) return;
  if (i + 1 < Q.length) {
    i++;
    ask();
  } else {
    finish(false);
  }
};

function renderReview() {
  $("#review-count").textContent = `${sc} / ${Q.length} réponses justes`;
  $("#review").innerHTML = Q.map((question, index) => {
    const answered = Number.isInteger(question.choice);
    const correct = answered && question.r[question.choice].ok;
    const correctAnswer = question.r.find((answer) => answer.ok);
    const status = correct ? "Bonne réponse" : answered ? "À revoir" : "Sans réponse";
    const stateClass = correct ? "is-correct" : answered ? "is-wrong" : "is-unanswered";
    return `<article class="qz-review-item ${stateClass}">
      <div class="qz-review-meta"><span>Question ${index + 1}</span><strong>${status}</strong></div>
      <h3>${esc(question.question)}</h3>
      <p class="qz-review-answer"><span>Votre réponse</span><strong>${answered ? esc(question.r[question.choice].t) : "Aucune réponse enregistrée"}</strong></p>
      ${correct ? "" : `<p class="qz-review-answer qz-review-correct"><span>Bonne réponse</span><strong>${esc(correctAnswer.t)}</strong></p>`}
      <p class="qz-review-exp">${esc(question.explication)}</p>
    </article>`;
  }).join("");
}

/* Compte : si le visiteur est connecté (localStorage['vc-account'] écrit par /mon-compte),
   le quiz terminé est mis en file dans localStorage['vc-quiz-pending'], puis envoyé tout de suite au compte
   (/api/quiz-sync) ; à défaut, la page Mon compte l’enregistre. */
function saveForAccount(elapsed, timedOut) {
  try {
    const acc = JSON.parse(localStorage.getItem("vc-account") || "null");
    if (!acc || !acc.id) return;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
    const rec = {
      id: uuid, uid: acc.id, played_at: new Date().toISOString(),
      species: cat, species_label: cat === "tous" ? "Tous les animaux" : CAT[cat] || cat,
      level: lv, level_label: lv === "tous" ? "Mélange" : LV[lv][0],
      score: sc, total: Q.length, elapsed_seconds: elapsed, limit_seconds: totalSeconds, timed_out: timedOut,
      questions: Q.map((q) => ({
        q: q.question, options: q.r.map((a) => a.t), correct: q.r.findIndex((a) => a.ok),
        choice: Number.isInteger(q.choice) ? q.choice : null, exp: q.explication || "", cat: q.categorie, niveau: q.niveau,
      })),
    };
    const list = JSON.parse(localStorage.getItem("vc-quiz-pending") || "[]");
    list.push(rec);
    localStorage.setItem("vc-quiz-pending", JSON.stringify(list.slice(-30)));
    const note = document.getElementById("account-save-note");
    if (note) note.hidden = false;
    syncAccountQuizzes(acc.id);
  } catch (e) { /* stockage indisponible : le quiz reste affiché sans être enregistré */ }
}

/* Envoi immédiat au compte (pour les objectifs) ; si la connexion a expiré,
   la file reste et la page Mon compte l’enregistrera à la prochaine visite. */
function syncAccountQuizzes(uid) {
  try {
    let token = null;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.+-auth-token$/.test(k)) continue;
      const s = JSON.parse(localStorage.getItem(k) || "null");
      const t = s && (s.access_token || (s.currentSession && s.currentSession.access_token));
      const exp = s && (s.expires_at || (s.currentSession && s.currentSession.expires_at));
      if (t && (!exp || exp * 1000 > Date.now() + 30000) && s.user && s.user.id === uid) { token = t; break; }
    }
    if (!token) return;
    const list = JSON.parse(localStorage.getItem("vc-quiz-pending") || "[]");
    const attempts = list.filter((q) => q && q.uid === uid);
    if (!attempts.length) return;
    fetch("/api/quiz-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ attempts }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!res || !Array.isArray(res.saved) || !res.saved.length) return;
        const done = new Set(res.saved);
        const rest = JSON.parse(localStorage.getItem("vc-quiz-pending") || "[]").filter((q) => !(q && done.has(q.id)));
        localStorage.setItem("vc-quiz-pending", JSON.stringify(rest));
      })
      .catch(() => {});
  } catch (e) { /* hors ligne : la file reste */ }
}

function finish(timedOut = false) {
  if (finished) return;
  finished = true;
  quizActive = false;
  stopTimer();
  sc = countCorrectAnswers(Q);
  const elapsed = timedOut ? totalSeconds : elapsedQuizSeconds(startedAt, Date.now(), totalSeconds);
  const percent = scorePercent(sc, Q.length);
  saveForAccount(elapsed, timedOut);
  const ratio = percent / 100;
  const loading = $("#loading");
  const loadingSteps = [
    "Calcul de votre pourcentage…",
    "Vérification du temps réalisé…",
    "Classement de vos réponses…",
    "Préparation de la correction…",
  ];
  $("#bar").style.width = "100%";
  $("#loading-count").textContent = "0 %";
  $("#loading-step").textContent = loadingSteps[0];
  loading.classList.remove("is-running");
  loading.style.setProperty("--qz-loading-duration", `${RESULT_LOADING_MS}ms`);
  void loading.offsetWidth;
  show("#loading");
  loading.classList.add("is-running");
  scrollTo({ top: 0, behavior: "smooth" });
  const loadingStarted = Date.now();
  const loadingInterval = window.setInterval(() => {
    const progress = Math.min(100, Math.floor(((Date.now() - loadingStarted) / RESULT_LOADING_MS) * 100));
    $("#loading-count").textContent = `${progress} %`;
    $("#loading-step").textContent = loadingSteps[Math.min(loadingSteps.length - 1, Math.floor(progress / 25))];
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(loadingInterval);
    $("#loading-count").textContent = "100 %";
    $("#lvl").textContent = `${cat === "tous" ? "Tous les animaux" : CAT[cat]} · ${lv === "tous" ? "Mélange" : LV[lv][0]}`;
    $("#sc").innerHTML = `${sc}<span>/${Q.length}</span>`;
    $("#percent").textContent = `${percent} % de réussite`;
    $("#elapsed").textContent = formatClock(elapsed);
    $("#time-detail").textContent = `sur ${formatClock(totalSeconds)} disponibles`;
    $("#timeout-note").hidden = !timedOut;
    $("#review-panel").hidden = true;
    $("#show-review").textContent = "Voir la correction";
    $("#msg").textContent = ratio === 1
      ? "Sans faute ! Vous pouvez tenter le niveau au-dessus."
      : ratio >= 0.8
        ? "Très beau score, vous connaissez bien le sujet."
        : ratio >= 0.5
          ? "Pas mal du tout. La correction vous aidera à consolider vos acquis."
          : "Prenez le temps de lire la correction : chaque explication vous fera progresser.";
    renderReview();
    show("#end");
    scrollTo({ top: 0, behavior: "smooth" });
  }, RESULT_LOADING_MS);
}

$("#again").onclick = () => {
  quizActive = false;
  stopTimer();
  show("#intro");
  scrollTo({ top: 0, behavior: "smooth" });
};

$("#show-review").onclick = () => {
  const panel = $("#review-panel");
  panel.hidden = !panel.hidden;
  $("#show-review").textContent = panel.hidden ? "Voir la correction" : "Masquer la correction";
  if (!panel.hidden) panel.scrollIntoView({ behavior: "smooth", block: "start" });
};

function closeQuitDialog() {
  $("#quit-modal").hidden = true;
  document.body.classList.remove("qz-modal-open");
  pendingHref = null;
  if (lastFocus) lastFocus.focus();
}

function openQuitDialog(href) {
  pendingHref = href;
  lastFocus = document.activeElement;
  $("#quit-modal").hidden = false;
  document.body.classList.add("qz-modal-open");
  $("#stay").focus();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!shouldConfirmQuizExit(quizActive) || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openQuitDialog(link.href);
}, true);

$("#stay").onclick = closeQuitDialog;
$("#quit").onclick = () => {
  const target = pendingHref;
  quizActive = false;
  closeQuitDialog();
  if (target) window.location.href = target;
};
$("#quit-modal").onclick = (event) => {
  if (event.target === $("#quit-modal")) closeQuitDialog();
};
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#quit-modal").hidden) closeQuitDialog();
});
window.addEventListener("beforeunload", (event) => {
  if (!shouldConfirmQuizExit(quizActive)) return;
  event.preventDefault();
  event.returnValue = "";
});

show("#intro");
