import assert from "node:assert/strict";
import test from "node:test";
import Cube from "cubejs";
import { ANTISUNE, BOWTIE, CHAMELEON, HEADLIGHTS, OLL_H, OLL_PI, SUNE, UA_PERM, UB_PERM, Z_PERM, beginnerSolve, play, T_PERM, type Group } from "../src/beginner.ts";
import { CFOP_STAGES, cfopSolve } from "../src/cfop.ts";
import { SOLVED, STICKERS, stickerAt, type Vec } from "../src/cube.ts";

const uniform = (s: string) => [0, 1, 2, 3, 4, 5].every((f) => new Set(s.slice(9 * f, 9 * f + 9)).size === 1);
const at = (s: string, pos: Vec, n: Vec) => s[stickerAt(pos, n)!];
const center = (s: string, n: Vec) => at(s, n, n);
/** Every sticker below the top layer matches its face's center. */
const twoLayers = (s: string) => STICKERS.every(({ pos, normal }, i) => pos[1] === 1 || s[i] === center(s, normal));
const cross = (s: string) => [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]].every((p) => STICKERS.every(({ pos, normal }, i) => `${pos}` !== `${p}` || s[i] === center(s, normal)));
const UP: Vec = [0, 1, 0];
const yellowUp = (s: string, p: Vec) => at(s, p, UP) === center(s, UP);
const CORNERS: Record<string, Vec> = { UFR: [1, 1, 1], UFL: [-1, 1, 1], UBL: [-1, 1, -1], UBR: [1, 1, -1] };

/** Each group, with the cube before it and after each of its steps. */
function walk(start: string, groups: Group[]) {
  let s = start;
  return groups.map((g) => {
    const before = s;
    const after: string[] = [];
    let i = 0;
    for (const step of g.steps!) {
      s = play(s, g.moves.slice(i, (i += step.count)));
      after.push(s);
    }
    return { g, before, after, end: s };
  });
}

test("CFOP solves random cubes stage by stage, in about half the beginner method's moves", () => {
  let cfop = 0;
  let beginner = 0;
  for (let i = 0; i < 100; i++) {
    const start = Cube.random().asString();
    const groups = cfopSolve(start);
    const run = walk(start, groups);
    assert.ok(uniform(run.at(-1)!.end), `not solved from ${start}`);
    const stages = groups.map((g) => g.stage);
    assert.deepEqual(stages, [...stages].sort((a, b) => a - b), "stages run in order");
    assert.ok(stages.every((st) => st < CFOP_STAGES.length));
    // Each stage keeps what the stages before it built.
    const lastOf = (stage: number) => run.filter((r) => r.g.stage <= stage).at(-1)!.end;
    assert.ok(cross(lastOf(1)), "the cross is done");
    assert.ok(twoLayers(lastOf(2)), "the first two layers are done");
    assert.ok([[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]].every((p) => yellowUp(lastOf(3), p as Vec)) && twoLayers(lastOf(3)), "the yellow cross");
    assert.ok(Object.values(CORNERS).every((p) => yellowUp(lastOf(4), p)) && twoLayers(lastOf(4)), "the yellow face");
    // At most 4 cross edges and 4 pairs, each its own instruction.
    assert.ok(groups.filter((g) => g.stage === 1).length <= 4 && groups.filter((g) => g.stage === 2).length <= 4);
    for (const g of groups) assert.equal(g.steps!.reduce((n, st) => n + st.count, 0), g.moves.length, g.text);
    for (const g of groups.filter((g) => g.stage === 2)) assert.ok(g.piece?.length === 3 && g.pair?.length === 2, g.text);
    cfop += groups.flatMap((g) => g.moves).length;
    beginner += beginnerSolve(start).flatMap((g) => g.moves).length;
  }
  assert.ok(cfop < beginner * 0.6, `${cfop / 100} moves against ${beginner / 100}`);
  assert.deepEqual(cfopSolve(SOLVED).map((g) => g.stage), [0]);
});

test("each last-layer instruction holds the cube the way its text says", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const start = Cube.random().asString();
    for (const { g, before, after } of walk(start, cfopSolve(start))) {
      const alg = g.alg?.moves;
      // The case, held: the cube right before the algorithm, the group's last step.
      const held = after.length > 1 ? after.at(-2)! : before;
      if (g.stage === 4) {
        const up = Object.entries(CORNERS).filter(([, p]) => yellowUp(held, p)).map(([n]) => n);
        const faces = (n: string, side: Vec) => at(held, CORNERS[n], side) === center(held, UP);
        const name = alg === SUNE ? "sune" : alg === ANTISUNE ? "antisune" : alg === OLL_H ? "H" : alg === OLL_PI ? "pi" : alg === HEADLIGHTS ? "headlights" : alg === CHAMELEON ? "T" : alg === BOWTIE ? "bowtie" : "?";
        seen.add(name);
        if (name === "sune") assert.deepEqual(up, ["UFL"]);
        if (name === "antisune") assert.deepEqual(up, ["UBR"]);
        if (name === "H") assert.ok(!up.length && faces("UFL", [-1, 0, 0]) && faces("UBL", [-1, 0, 0]) && faces("UFR", [1, 0, 0]) && faces("UBR", [1, 0, 0]));
        if (name === "pi") assert.ok(!up.length && faces("UFL", [-1, 0, 0]) && faces("UBL", [-1, 0, 0]));
        if (name === "headlights") assert.ok(`${up}` === "UBL,UBR" && faces("UFL", [0, 0, 1]) && faces("UFR", [0, 0, 1]));
        if (name === "T") assert.deepEqual(up.sort(), ["UBR", "UFR"]);
        if (name === "bowtie") assert.ok(`${up.sort()}` === "UBL,UFR" && faces("UFL", [0, 0, 1]));
      }
      if (alg === T_PERM) {
        assert.equal(at(held, CORNERS.UFL, [-1, 0, 0]), at(held, CORNERS.UBL, [-1, 0, 0]), "headlights on the left");
      }
      if (alg === UA_PERM || alg === UB_PERM || alg === Z_PERM) {
        const home = (p: Vec) => STICKERS.every(({ pos, normal }, i) => `${pos}` !== `${p}` || held[i] === center(held, normal));
        if (alg !== Z_PERM) assert.ok(home([0, 1, -1]) && home(CORNERS.UBL) && home(CORNERS.UBR), "the complete face at the back");
        else assert.ok([[0, 1, 1], [-1, 1, 0]].every((p) => !home(p as Vec)), "front and left to swap");
      }
    }
  }
  assert.equal(seen.size, 7, `${[...seen]}`);
});

test("a cross edge takes at most 8 moves, and the cross search stays quick", () => {
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) for (const g of cfopSolve(Cube.random().asString()).filter((g) => g.stage === 1)) assert.ok(g.moves.length <= 8, g.moves.join(" "));
  assert.ok((performance.now() - t0) / 50 < 100, "under 100 ms per cube");
});
