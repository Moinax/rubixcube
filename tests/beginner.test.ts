import assert from "node:assert/strict";
import test from "node:test";
import Cube from "cubejs";
import { algOf, beginnerSolve, facing, findPiece, homeOf, LEFT, RIGHT, SEXY, slotOf, STAGES, times } from "../src/beginner.ts";
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

test("each sequence is named, after its setup", () => {
  assert.deepEqual(algOf(["y", "U", ...times(SEXY, 3)]), { name: "sexy move", moves: SEXY, reps: 3, setup: 2 });
  assert.equal(algOf(["U", "R2"]), undefined);
  for (let i = 0; i < 20; i++)
    for (const g of beginnerSolve(Cube.random().asString()).filter((g) => g.stage >= 3)) {
      const alg = g.alg;
      // Only a turn of the top to line it up goes without a sequence.
      assert.ok(alg || g.moves.every((m) => m[0] === "U"), g.text);
      // The setup keeps its own turns: U then the right insert is not merged into U2.
      if (g.stage === 4) assert.ok([RIGHT, LEFT].includes(alg!.moves), g.text);
    }
});

test("a place named by its centers is found again on the cube turned", () => {
  const places = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z] as [number, number, number])));
  for (const turn of [[], ["y"], ["x", "z2"]]) {
    const s = turn.reduce(applyMove, "R U F' L2 D".split(" ").reduce(applyMove, SOLVED));
    for (const p of places.filter((p) => p.filter(Boolean).length >= 2)) {
      assert.deepEqual(homeOf(s, slotOf(s, p)), p);
      // The same place, after one more turn of the whole cube, is where that turn takes it.
      const y = applyMove(s, "y");
      assert.deepEqual(homeOf(y, slotOf(s, p)), [0 - p[2] || 0, p[1], p[0]]);
    }
  }
});

test("a cube turn brings the faces to turn in front, and the moves seen from there do the same", () => {
  const s = "R U F' L2 D B' R2 U' F2 L".split(" ").reduce(applyMove, SOLVED);
  for (const moves of [["B2"], ["L'", "U", "B"], ["F", "R'"], ["D", "L2"]]) {
    const [turn, seen] = facing(moves);
    // Turning the cube, then the moves named from the new front, leaves it as the moves would, turned.
    assert.equal([...turn, ...seen].reduce(applyMove, s), [...moves, ...turn].reduce(applyMove, s), moves.join(" "));
  }
  assert.deepEqual(facing(["B2"]), [["y", "y"], ["F2"]]);
  assert.deepEqual(facing(["R", "U"]), [[], ["R", "U"]]);
});
