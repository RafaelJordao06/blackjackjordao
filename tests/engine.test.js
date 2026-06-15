const assert = require("node:assert/strict");
const test = require("node:test");

const engine = require("../web/engine.js");

test("eight deck shoe counts", () => {
  const shoe = engine.buildShoe(8);

  assert.equal(engine.totalCards(shoe), 416);
  assert.equal(shoe[0], 32);
  assert.equal(shoe[8], 32);
  assert.equal(shoe[9], 128);
});

test("face cards normalize to ten", () => {
  assert.equal(engine.normalizeCard("K"), "10");
  assert.equal(engine.normalizeCard("Q"), "10");
  assert.equal(engine.normalizeCard("J"), "10");
});

test("hand values soft and blackjack", () => {
  assert.deepEqual(engine.handValue(["A", "5"]), {
    total: 16,
    soft: true,
    blackjack: false,
    bust: false,
  });

  assert.equal(engine.handValue(["A", "K"]).blackjack, true);
});

test("insurance EV is unfavorable on fresh shoe after dealer ace", () => {
  const shoe = engine.removeCards(engine.buildShoe(8), ["A"]);

  assert.ok(engine.insuranceEv("A", shoe) < 0);
});

test("pair hand includes split and recommends max EV action", () => {
  const analysis = engine.analyzeHand(["8", "8"], "6");
  const sorted = Object.entries(analysis.action_ev).sort((a, b) => b[1] - a[1]);

  assert.ok("split" in analysis.action_ev);
  assert.equal(analysis.recommendation, sorted[0][0]);
});

test("table analyzer waits for dealer upcard", () => {
  const result = engine.analyzeTable({ hand: ["8", "8"], dealer: [], seen: [], decks: 8 });

  assert.equal(result.ready, false);
  assert.match(result.message, /crupie/);
});
