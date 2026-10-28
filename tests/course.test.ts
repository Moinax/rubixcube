import assert from "node:assert/strict";
import test from "node:test";
import { beginnerSolve, planStates, STAGES } from "../src/beginner.ts";
import { COURSE } from "../src/course.ts";
import { applyMove, colorsOf, PIECES, SOLVED, STICKERS, stickerAt, type Vec } from "../src/cube.ts";

const at = (s: string, pos: Vec, normal: Vec) => s[stickerAt(pos, normal)!];
const center = (s: string, n: Vec) => at(s, n, n);
const SIDES: Vec[] = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
const yellowEdgesUp = (s: string) => [[-1, 1, 0], [1, 1, 0], [0, 1, -1], [0, 1, 1]].map((p) => at(s, p as Vec, [0, 1, 0]) === "D");
const edgesAligned = (s: string) => SIDES.map((n) => at(s, [n[0], 1, n[2]], n) === center(s, n));
const placed = (s: string) =>
  [[1, 1, 1], [-1, 1, 1], [-1, 1, -1], [1, 1, -1]].filter((pos) => {
    const c = PIECES.find((p) => `${STICKERS[p[0]].pos}` === `${pos}`)!;
    return colorsOf(s, c) === c.map((i) => center(s, STICKERS[i].normal)).sort().join("");
  }).length;
const demo = (title: string) => COURSE.find((g) => g.title === title)!.from!;

test("the course covers every stage in order, each demo held yellow up and green in front", () => {
  assert.deepEqual([...new Set(COURSE.map((g) => g.stage))], STAGES.map((_, i) => i));
  for (const g of COURSE.filter((g) => g.stage > 0)) {
    assert.equal(center(g.from!, [0, 1, 0]), "D", g.title);
    assert.equal(center(g.from!, [0, 0, 1]), "F", g.title);
  }
});

test("each demo starts on the case its text describes", () => {
  const whiteGreen = (s: string, pos: Vec, whiteSide: Vec) => at(s, pos, whiteSide) === "U";
  assert.ok(whiteGreen(demo("En bas, blanc dessous"), [0, -1, 1], [0, -1, 0]));
  assert.ok(whiteGreen(demo("Au milieu"), [1, 0, 1], [1, 0, 0]));
  assert.ok(whiteGreen(demo("En haut, blanc sur le côté"), [0, 1, 1], [0, 0, 1]));
  assert.ok(whiteGreen(demo("En bas, blanc sur le côté"), [0, -1, 1], [0, 0, 1]));
  assert.equal(at(demo("Blanc à droite"), [1, 1, 1], [1, 0, 0]), "U");
  assert.equal(at(demo("Blanc en haut"), [1, 1, 1], [0, 1, 0]), "U");
  assert.equal(at(demo("Blanc devant"), [1, 1, 1], [0, 0, 1]), "U");
  assert.equal(at(demo("Coin en bas mal tourné"), [1, -1, 1], [1, 0, 0]), "U");
  assert.equal(at(demo("Vers la droite"), [0, 1, 1], [0, 1, 0]), "L"); // orange on top, orange on the right
  assert.equal(at(demo("Vers la gauche"), [0, 1, 1], [0, 1, 0]), "R");
  const stuck = demo("Arête coincée au milieu");
  assert.deepEqual([at(stuck, [1, 0, 1], [0, 0, 1]), at(stuck, [1, 0, 1], [1, 0, 0])], ["L", "F"]); // green-orange, flipped
  assert.deepEqual(yellowEdgesUp(demo("Le point")), [false, false, false, false]);
  const dot = COURSE.find((g) => g.title === "Le point")!;
  assert.equal(yellowEdgesUp(dot.moves.reduce(applyMove, dot.from!)).filter(Boolean).length, 2); // an L

  assert.deepEqual(yellowEdgesUp(demo("Le L")), [true, false, true, false]); // left and back
  assert.deepEqual(yellowEdgesUp(demo("La ligne")), [true, true, false, false]); // left and right
  assert.deepEqual(edgesAligned(demo("Deux voisines bonnes")), [false, true, true, false]); // right and back
  assert.ok([[true, false, true, false], [false, true, false, true]].some((a) => `${a}` === `${edgesAligned(demo("Deux en face"))}`));
  assert.equal(placed(demo("Un coin bien placé")), 1);
  assert.equal(placed(demo("Aucun coin bien placé")), 0);
});

test("the last demo turns the corners and leaves the cube solved", () => {
  const last = COURSE.at(-1)!;
  const end = last.moves.reduce(applyMove, last.from!);
  assert.equal(end, applyMove("UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB", "z2"));
  assert.notEqual(at(last.from!, [1, 1, 1], [0, 1, 0]), "D");
});

test("planStates starts each course demo from its own cube and ends a beginner plan solved", () => {
  const states = planStates(COURSE[0].from!, COURSE);
  let i = 0;
  for (const g of COURSE) {
    assert.equal(states[i], g.from, g.title);
    i += g.moves.length;
  }
  assert.equal(states.length, i + 1);
  const start = "R U F' L2 D B' R2 U' F2 L".split(" ").reduce(applyMove, SOLVED);
  const end = planStates(start, beginnerSolve(start)).at(-1)!;
  assert.ok([0, 1, 2, 3, 4, 5].every((f) => new Set(end.slice(9 * f, 9 * f + 9)).size === 1));
});

test("stages come in order, so each stage's moves are one run the progress bar can measure", () => {
  const ordered = (groups: { stage: number }[]) => groups.every((g, i) => i === 0 || groups[i - 1].stage <= g.stage);
  assert.ok(ordered(COURSE));
  const start = "D' R2 F U' L B2 R' D F2 U".split(" ").reduce(applyMove, SOLVED);
  assert.ok(ordered(beginnerSolve(start)));
});
