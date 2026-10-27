import assert from "node:assert/strict";
import test from "node:test";
import Cube from "cubejs";
import { applyMove, classify, FACES, SOLVED, solve, suspects, validate, type RGB } from "../src/cube.ts";

const MOVES = [...FACES].flatMap((f) => [f, f + "'", f + "2"]);

test("applyMove matches cubejs on every move and on a long sequence", () => {
  for (const m of MOVES) assert.equal(applyMove(SOLVED, m), new Cube().move(m).asString(), m);
  const alg = Array.from({ length: 40 }, (_, i) => MOVES[(i * 7) % 18]);
  assert.equal(alg.reduce(applyMove, SOLVED), new Cube().move(alg.join(" ")).asString());
});

test("solve brings random cubes back to solved", () => {
  for (let i = 0; i < 10; i++) {
    const state = Cube.random().asString();
    assert.equal(validate(state), null);
    assert.equal(solve(state).reduce(applyMove, state), SOLVED);
  }
  assert.deepEqual(solve(SOLVED), []);
});

test("validate rejects impossible cubes", () => {
  const swap = (s: string, i: number, j: number) => {
    const a = s.split("");
    [a[i], a[j]] = [a[j], a[i]];
    return a.join("");
  };
  assert.match(validate(SOLVED.replace("R", "U"))!, /10 cases blanc/);
  assert.match(validate(swap(SOLVED, 7, 19))!, /arête/); // U8 <-> F2: flipped UF edge
  assert.notEqual(validate(swap(swap(SOLVED, 8, 9), 9, 20)), null); // twisted UFR corner
});

test("classify recovers a scrambled cube from noisy colors", () => {
  const rgb: Record<string, RGB> = {
    U: [235, 235, 230], R: [200, 30, 30], F: [20, 170, 80],
    D: [240, 215, 20], L: [250, 120, 25], B: [20, 90, 210],
  };
  const state = Cube.random().asString();
  const noisy = [...state].map((f, i) => rgb[f].map((c) => Math.max(0, c - (i % 5) * 9)) as RGB);
  assert.equal(classify(noisy), state);
});

test("classify fixes a red sticker read as orange, and suspects points at it", () => {
  const rgb: Record<string, RGB> = {
    U: [235, 235, 230], R: [200, 30, 30], F: [20, 170, 80],
    D: [240, 215, 20], L: [250, 120, 25], B: [20, 90, 210],
  };
  const state = "R U F' L2 D B' R2 U' F2 L".split(" ").reduce(applyMove, SOLVED);
  const red = [...state].findIndex((f, i) => f === "R" && i % 9 !== 4);
  const samples = [...state].map((f, i) => rgb[f].map((c) => Math.max(0, c - (i % 5) * 9)) as RGB);
  samples[red] = [250, 118, 26]; // under warm light red reads as plain orange
  assert.equal(classify(samples), state);

  const misread = state.slice(0, red) + "L" + state.slice(red + 1);
  assert.ok(suspects(misread).has(red));
});
