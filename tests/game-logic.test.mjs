import assert from "node:assert/strict";
import test from "node:test";

import {
  CREW_CARDS,
  calculateResponse,
  createInitialHand,
  drawNextEvent,
  fillHand,
  getTitle,
  scoreResolution,
} from "../lib/game.ts";

test("all eleven ranks use distinct names and character images", () => {
  assert.equal(CREW_CARDS.length, 11);
  assert.equal(new Set(CREW_CARDS.map((card) => card.name)).size, 11);
  assert.equal(new Set(CREW_CARDS.map((card) => card.image)).size, 11);
  assert.deepEqual(
    CREW_CARDS.slice(3).map((card) => card.name),
    ["3항사", "3기사", "2항사", "2기사", "1항사", "1기사", "선장", "기관장"],
  );
});

test("initial hand contains four unique cards", () => {
  const hand = createInitialHand(() => 0.42);
  assert.equal(hand.length, 4);
  assert.equal(new Set(hand).size, 4);
});

test("next event never repeats the previous event", () => {
  const event = drawNextEvent("deck-flood", () => 0);
  assert.notEqual(event.id, "deck-flood");
});

test("deckhand and boatswain trigger deck combo", () => {
  const result = calculateResponse(["deckhand", "boatswain"], "deck");
  assert.equal(result.total, 8);
  assert.equal(result.comboBonus, 2);
  assert.equal(result.activeCombos.length, 1);
});

test("combo only boosts its matching skill", () => {
  const result = calculateResponse(["deckhand", "boatswain"], "navigation");
  assert.equal(result.total, 0);
  assert.equal(result.activeCombos.length, 0);
});

test("engine rating and third engineer trigger engine combo", () => {
  const result = calculateResponse(["engine-rating", "third-engineer"], "engine");
  assert.equal(result.total, 7);
  assert.equal(result.comboBonus, 2);
});

test("exact success with combo scores all bonuses once", () => {
  assert.equal(scoreResolution({ success: true, total: 8, required: 8, comboCount: 1 }), 180);
  assert.equal(scoreResolution({ success: false, total: 3, required: 5, comboCount: 0 }), 0);
});

test("used cards rest for the next hand", () => {
  const next = fillHand(
    ["deckhand", "boatswain", "engine-rating", "chief-engineer"],
    ["deckhand", "boatswain"],
    () => 0,
  );
  assert.equal(next.length, 4);
  assert.ok(!next.includes("deckhand"));
  assert.ok(!next.includes("boatswain"));
});

test("titles follow score thresholds and game over override", () => {
  assert.equal(getTitle(699), "갑판원");
  assert.equal(getTitle(700), "3항사");
  assert.equal(getTitle(1000), "1항사");
  assert.equal(getTitle(1300), "전설의 선장");
  assert.equal(getTitle(9999, true), "멀미하는 견습생");
});
