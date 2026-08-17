import assert from "node:assert/strict";
import test from "node:test";
import { createNewGame } from "../src/game.js";
import {
  clearSavedState,
  loadHighScore,
  loadSavedState,
  saveGameState,
  saveHighScore,
} from "../src/infrastructure/persistence.js";

function installStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
  return values;
}

test("saved runs restore their gameplay state and RNG position", () => {
  installStorage();
  const game = createNewGame(90210, "Ashen");
  game.gold = 777;
  game.rng.next();

  saveGameState(game);
  const restored = loadSavedState();

  assert.equal(restored.seed, game.seed);
  assert.equal(restored.gold, 777);
  assert.equal(restored.rng.state, game.rng.state);
});

test("saved runs can be cleared", () => {
  installStorage();
  saveGameState(createNewGame(42, "Ashen"));
  clearSavedState();
  assert.equal(loadSavedState(), null);
});

test("high scores persist as numbers", () => {
  installStorage();
  saveHighScore(1234);
  assert.equal(loadHighScore(), 1234);
});
