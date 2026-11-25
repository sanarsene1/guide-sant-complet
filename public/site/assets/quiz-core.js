export const QUESTION_SECONDS_BY_LEVEL = {
  facile: 30,
  normal: 45,
  difficile: 60,
  expert: 70,
};
export const MIN_QUIZ_SECONDS = 3 * 60;
export const MAX_QUIZ_SECONDS = 20 * 60;
export const RESULT_LOADING_MS = 5000;

export function quizDurationSeconds(questions) {
  const list = Array.isArray(questions) ? questions : [];
  const duration = list.reduce((total, question) => {
    const level = typeof question === "string" ? question : question?.niveau;
    return total + (QUESTION_SECONDS_BY_LEVEL[level] ?? QUESTION_SECONDS_BY_LEVEL.normal);
  }, 0);
  return Math.min(MAX_QUIZ_SECONDS, Math.max(MIN_QUIZ_SECONDS, duration));
}

export function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function scorePercent(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export function elapsedQuizSeconds(startedAt, endedAt, limitSeconds) {
  return Math.min(limitSeconds, Math.max(0, Math.round((endedAt - startedAt) / 1000)));
}

export function shouldConfirmQuizExit(quizActive) {
  return quizActive === true;
}

export function countCorrectAnswers(questions) {
  return questions.reduce((total, question) => {
    const answer = Number.isInteger(question.choice) ? question.r[question.choice] : null;
    return total + (answer?.ok ? 1 : 0);
  }, 0);
}
