import assert from "node:assert/strict";
import test from "node:test";

import {
  CREW_CARDS,
  EVENTS,
  GAME_RULES,
  canRespondWithHand,
  calculateResponse,
  drawHandForEvent,
  drawNextEvent,
  evaluateDuty,
  getResultTier,
  getTitle,
  scoreResolution,
} from "../lib/game.ts";
import {
  normalizeNickname,
  scoreBounds,
  validateLeaderboardSubmission,
  validateNickname,
} from "../lib/leaderboard.ts";

test("all eleven ranks use distinct names and character images", () => {
  assert.equal(CREW_CARDS.length, 11);
  assert.equal(new Set(CREW_CARDS.map((card) => card.name)).size, 11);
  assert.equal(new Set(CREW_CARDS.map((card) => card.image)).size, 11);
  assert.deepEqual(
    CREW_CARDS.map((card) => card.name),
    ["갑판원", "기관원", "3항사", "3기사", "2항사", "2기사", "1항사", "1기사", "선장", "기관장", "조리장"],
  );
});

test("event hand contains four unique cards and a viable response", () => {
  for (const event of EVENTS) {
    const hand = drawHandForEvent(event, [], () => 0.2);
    assert.equal(hand.length, GAME_RULES.handSize);
    assert.equal(new Set(hand).size, GAME_RULES.handSize);
    assert.equal(evaluateDuty(hand, event).success, true, `${event.name} hand should be viable`);
  }
});

test("navigation hand never becomes engine-only when captain is resting", () => {
  const event = EVENTS.find((item) => item.id === "fog");
  assert.ok(event);
  const hand = drawHandForEvent(event, ["captain"], () => 0.8);
  assert.ok(!hand.includes("captain"));
  assert.ok(hand.some((id) => (CREW_CARDS.find((card) => card.id === id)?.stats.navigation ?? 0) > 0));
});

test("rough hands keep the right department but may require taking damage", () => {
  const collision = EVENTS.find((event) => event.id === "collision");
  assert.ok(collision);
  const hand = drawHandForEvent(collision, [], () => 0.9);
  assert.ok(hand.some((id) => (CREW_CARDS.find((card) => card.id === id)?.stats.navigation ?? 0) > 0));
  assert.equal(canRespondWithHand(hand, collision), false);
});

test("department heads appear frequently and still rest after use", () => {
  const engineEvent = EVENTS.find((event) => event.id === "main-engine");
  const navigationEvent = EVENTS.find((event) => event.id === "collision");
  assert.ok(engineEvent);
  assert.ok(navigationEvent);
  assert.ok(drawHandForEvent(engineEvent, [], () => 0.2).includes("chief-engineer"));
  assert.ok(drawHandForEvent(navigationEvent, [], () => 0.2).includes("captain"));
  assert.ok(!drawHandForEvent(engineEvent, ["chief-engineer"], () => 0.2).includes("chief-engineer"));
  assert.ok(!drawHandForEvent(navigationEvent, ["captain"], () => 0.2).includes("captain"));
});

test("next event never repeats the previous event", () => {
  const event = drawNextEvent("deck-flood", () => 0);
  assert.notEqual(event.id, "deck-flood");
});

test("deckhand and chief officer trigger deck combo", () => {
  const result = calculateResponse(["deckhand", "chief-officer"], "deck");
  assert.equal(result.total, 8);
  assert.equal(result.comboBonus, 2);
  assert.equal(result.activeCombos.length, 1);
});

test("combo only boosts its matching skill", () => {
  const result = calculateResponse(["deckhand", "chief-officer"], "navigation");
  assert.equal(result.total, 3);
  assert.equal(result.activeCombos.length, 0);
});

test("cook chief boosts the active response by 1.5 with favorable rounding", () => {
  const deck = calculateResponse(["deckhand", "cook-chief"], "deck");
  assert.deepEqual(
    { total: deck.total, supportBonus: deck.supportBonus, supportActive: deck.supportActive },
    { total: 3, supportBonus: 1, supportActive: true },
  );
  const combo = calculateResponse(["engine-rating", "third-engineer", "cook-chief"], "engine");
  assert.equal(combo.total, 11);
  assert.equal(combo.supportBonus, 4);
  assert.equal(calculateResponse(["cook-chief"], "navigation").total, 0);
});

test("engine rating and third engineer trigger engine combo", () => {
  const result = calculateResponse(["engine-rating", "third-engineer"], "engine");
  assert.equal(result.total, 7);
  assert.equal(result.comboBonus, 2);
});

test("response at or above the requirement succeeds", () => {
  const offCourse = EVENTS.find((event) => event.id === "off-course");
  const collision = EVENTS.find((event) => event.id === "collision");
  const fog = EVENTS.find((event) => event.id === "fog");
  assert.ok(offCourse);
  assert.ok(collision);
  assert.ok(fog);
  assert.deepEqual(evaluateDuty(["second-officer"], offCourse), {
    total: 5,
    comboBonus: 0,
    supportBonus: 0,
    supportActive: false,
    activeCombos: [],
    success: true,
  });
  assert.equal(evaluateDuty(["captain"], collision).success, true);
  assert.equal(evaluateDuty(["first-engineer"], fog).total, 0);
  assert.equal(evaluateDuty(["first-engineer"], fog).success, false);
});

test("exact success with combo scores all bonuses once", () => {
  assert.equal(scoreResolution({ success: true, total: 8, required: 8, comboCount: 1 }), 180);
  assert.equal(scoreResolution({ success: false, total: 3, required: 5, comboCount: 0 }), 0);
});

test("normal difficulty increases pressure without changing the score system", () => {
  assert.equal(GAME_RULES.startingHull, 12);
  assert.equal(GAME_RULES.dutyPoints, 6);
  assert.equal(GAME_RULES.failureDamage, 3);
  assert.equal(GAME_RULES.viableHandRate, 0.75);
  assert.equal(GAME_RULES.seniorAppearanceRate, 0.67);
  assert.equal(GAME_RULES.cookAppearanceRate, 0.25);
  assert.deepEqual(
    [Math.min(...EVENTS.map((event) => event.required)), Math.max(...EVENTS.map((event) => event.required))],
    [4, 7],
  );
});

test("titles follow success-count thresholds with distinct illustrations", () => {
  const cases = [
    [0, "멀미하는 실습생"],
    [1, "멀미하는 실습생"],
    [2, "구명조끼 꽉 맨 갑판 병아리"],
    [3, "구명조끼 꽉 맨 갑판 병아리"],
    [4, "커피로 버티는 당직 요정"],
    [5, "커피로 버티는 당직 요정"],
    [6, "파도와 밀당하는 바다 해결사"],
    [7, "파도와 밀당하는 바다 해결사"],
    [8, "선장님도 찾는 만능 해남이"],
    [9, "선장님도 찾는 만능 해남이"],
    [10, "갈매기도 경례하는 전설의 해남이"],
  ];
  for (const [successes, title] of cases) assert.equal(getTitle(successes), title);
  assert.equal(new Set(cases.map(([successes]) => getResultTier(successes).image)).size, 6);
});

test("nickname validation accepts friendly names and rejects unsafe input", () => {
  assert.equal(normalizeNickname("  부산   해적왕  "), "부산 해적왕");
  assert.equal(validateNickname("부산해적왕"), null);
  assert.match(validateNickname("A") ?? "", /2~10자/);
  assert.match(validateNickname("해남이🚢") ?? "", /한글, 영문/);
  assert.match(validateNickname("시발선장") ?? "", /다른 친구들/);
});

test("leaderboard rejects scores outside possible game bounds", () => {
  assert.deepEqual(scoreBounds(0), { min: 0, max: 0 });
  assert.deepEqual(scoreBounds(5), { min: 500, max: 900 });
  assert.deepEqual(scoreBounds(7), { min: 850, max: 1410 });
  assert.deepEqual(scoreBounds(10), { min: 1600, max: 2400 });
  assert.equal(validateLeaderboardSubmission({ nickname: "부산해적왕", clientId: "12345678-1234-1234-1234-123456789012", score: 1600, successes: 10 }).ok, true);
  assert.equal(validateLeaderboardSubmission({ nickname: "부산해적왕", clientId: "12345678-1234-1234-1234-123456789012", score: 9999, successes: 10 }).ok, false);
});
