import assert from "node:assert/strict";
import test from "node:test";
import Cube from "cubejs";
import { beginnerSolve, findPiece, homeOf, STAGES } from "../src/beginner.ts";
import { applyMove, simplify, SOLVED, upright } from "../src/cube.ts";

// Solved up to a whole-cube rotation: every face is one color.
const uniform = (s: string) => [0, 1, 2, 3, 4, 5].every((f) => new Set(s.slice(9 * f, 9 * f + 9)).size === 1);

test("simplify merges turns of the same face", () => {
  assert.deepEqual(simplify(["U", "U", "R", "R'", "y", "y", "y"]), ["U2", "y'"]);
});

test("rotations turn the whole cube", () => {
  const z2 = applyMove(SOLVED, "z2");
  assert.equal(z2.slice(0, 9), "D".repeat(9));
  assert.equal(["y", "y", "y", "y"].reduce(applyMove, z2), z2);
  const scrambled = "R U F' L2 D".split(" ").reduce(applyMove, SOLVED);
  assert.equal(upright(["z2", "y'", "x"].reduce(applyMove, scrambled)), scrambled);
});

test("beginner method solves random cubes, stage by stage", () => {
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) {
    const start = Cube.random().asString();
    const groups = beginnerSolve(start);
    const end = groups.flatMap((g) => g.moves).reduce(applyMove, start);
    assert.ok(uniform(end), `not solved from ${start}`);
    const stages = groups.map((g) => g.stage);
    assert.deepEqual(stages, [...stages].sort((a, b) => a - b), "stages run in order");
  }
  console.log(`  ${((performance.now() - t0) / 200).toFixed(1)} ms per cube`);
  assert.deepEqual(beginnerSolve(SOLVED).map((g) => g.stage), [0]);
});

test("the outlined home is where stages 2 to 4 leave their piece", () => {
  for (let i = 0; i < 20; i++) {
    let s = Cube.random().asString();
    for (const g of beginnerSolve(s)) {
      s = g.moves.reduce(applyMove, s);
      if (STAGES[g.stage].toHome && g.piece && !/coincé|mal placée/.test(g.text)) assert.deepEqual(findPiece(s, g.piece), homeOf(s, g.piece), g.text);
    }
  }
});
