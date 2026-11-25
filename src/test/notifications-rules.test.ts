import { describe, expect, it } from "vitest";
import { reminderKindLabel, reminderPushDue } from "@/lib/reminder-schedule";
import { goalProgress, goalTitle, isGoalReached, shouldRemindGoal } from "@/lib/goals";
import { PET_CATEGORIES, PET_CATEGORY_KEYS } from "@/lib/pet-categories";
import { showPushBox } from "@/lib/push-visibility";
import { isNewAccount, welcomeFirstName, welcomePushText } from "@/lib/welcome";

const TZ = "Africa/Kinshasa"; // UTC+1
const at = (iso: string) => new Date(iso);
const reminder = { due_date: "2026-11-25", done: false, time_zone: TZ, notified_eve: false, notified_day: false };

describe("rappels de soin", () => {
  it("prévient la veille à partir de 18 h (heure locale)", () => {
    expect(reminderPushDue(reminder, at("2026-11-24T16:30:00Z"))).toBeNull(); // 17 h 30
    expect(reminderPushDue(reminder, at("2026-11-24T17:00:00Z"))).toBe("eve"); // 18 h
  });
  it("prévient le jour même à partir de 8 h (heure locale)", () => {
    expect(reminderPushDue(reminder, at("2026-11-25T06:00:00Z"))).toBeNull(); // 7 h
    expect(reminderPushDue(reminder, at("2026-11-25T07:00:00Z"))).toBe("day"); // 8 h
  });
  it("n'envoie pas deux fois ni pour un rappel fait", () => {
    expect(reminderPushDue({ ...reminder, notified_day: true }, at("2026-11-25T10:00:00Z"))).toBeNull();
    expect(reminderPushDue({ ...reminder, done: true }, at("2026-11-25T10:00:00Z"))).toBeNull();
  });
});

describe("rappels de soin : choix de la personne", () => {
  it("l'heure choisie remplace 18 h la veille et 8 h le jour même", () => {
    const r = { ...reminder, remind_hour: 10 };
    expect(reminderPushDue(r, at("2026-11-24T08:30:00Z"))).toBeNull(); // veille 9 h 30
    expect(reminderPushDue(r, at("2026-11-24T09:00:00Z"))).toBe("eve"); // veille 10 h
    expect(reminderPushDue({ ...r, notified_eve: true }, at("2026-11-25T08:00:00Z"))).toBeNull(); // jour J 9 h
    expect(reminderPushDue({ ...r, notified_eve: true }, at("2026-11-25T09:00:00Z"))).toBe("day"); // jour J 10 h
  });
  it("un type de soin écrit soi-même s'affiche tel quel", () => {
    expect(reminderKindLabel("vaccin")).toBe("Vaccin");
    expect(reminderKindLabel("Coupe des griffes")).toBe("Coupe des griffes");
    expect(reminderKindLabel("autre")).toBe("Autre soin");
  });
});

describe("objectifs", () => {
  const goal = {
    id: "g",
    kind: "quiz" as const,
    target: 2,
    period: "day" as const,
    remind_hour: 18,
    time_zone: TZ,
    created_at: "2026-11-20T08:00:00Z",
    achieved_at: null,
    last_notified_on: null,
  };
  it("« 2 quiz par jour » compte seulement les quiz du jour", () => {
    expect(goalTitle(goal)).toBe("2 quiz par jour");
    const now = at("2026-11-21T15:00:00Z");
    const quizzes = [{ played_at: "2026-11-20T20:00:00Z" }, { played_at: "2026-11-21T09:00:00Z" }];
    expect(goalProgress(goal, quizzes, [], now)).toBe(1);
    expect(isGoalReached(goal, 1)).toBe(false);
    expect(isGoalReached(goal, 2)).toBe(true);
  });
  it("rappelle à l'heure choisie, une fois par jour, et plus quand l'objectif est atteint", () => {
    expect(shouldRemindGoal(goal, at("2026-11-21T16:00:00Z"))).toBe(false); // 17 h
    expect(shouldRemindGoal(goal, at("2026-11-21T17:00:00Z"))).toBe(true); // 18 h
    expect(shouldRemindGoal({ ...goal, last_notified_on: "2026-11-21" }, at("2026-11-21T19:00:00Z"))).toBe(false);
    expect(shouldRemindGoal({ ...goal, achieved_at: "2026-11-21T10:00:00Z" }, at("2026-11-21T19:00:00Z"))).toBe(false);
  });
});

describe("catégories d'animaux", () => {
  it("propose les 4 catégories demandées", () => {
    expect(PET_CATEGORY_KEYS.map((k) => PET_CATEGORIES[k].label)).toEqual([
      "Animaux de compagnie",
      "Animaux d’élevage",
      "Volailles",
      "Poissons",
    ]);
  });
});

describe("bloc « Recevoir les notifications »", () => {
  it("disparaît dès qu'on a déjà accepté les notifications", () => {
    expect(showPushBox("off", "granted")).toBe(false);
    expect(showPushBox("ios-install", "granted")).toBe(false);
  });
  it("disparaît quand les notifications sont déjà actives", () => {
    expect(showPushBox("on", null)).toBe(false);
  });
  it("reste proposé tant qu'on n'a pas dit oui", () => {
    expect(showPushBox("off", null)).toBe(true);
    expect(showPushBox("off", "denied")).toBe(true);
  });
});

describe("notification de bienvenue", () => {
  const now = at("2026-11-21T12:00:00Z");
  it("part pour un compte créé il y a moins de 7 jours", () => {
    expect(isNewAccount("2026-11-21T11:59:00Z", now)).toBe(true);
    expect(isNewAccount("2026-11-14T12:00:00Z", now)).toBe(true);
  });
  it("ne part pas pour un ancien compte", () => {
    expect(isNewAccount("2026-11-14T11:59:00Z", now)).toBe(false);
    expect(isNewAccount(undefined, now)).toBe(false);
  });
  it("dit « Bienvenue sur VetoCare » avec le prénom quand on le connaît", () => {
    expect(welcomePushText(welcomeFirstName({ full_name: "Sara Mbuyi" })).title).toBe("Bienvenue sur VetoCare, Sara !");
    expect(welcomePushText(welcomeFirstName({})).title).toBe("Bienvenue sur VetoCare !");
  });
});
