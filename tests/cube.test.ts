import assert from "node:assert/strict";
import test from "node:test";
import Cube from "cubejs";
import { applyMove, classify, FACES, SOLVED, solve, suspects, validate, vivid, type RGB } from "../src/cube.ts";

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

test("vivid tells cube faces from a person, on real webcam frames", () => {
  // Faces of a mixed cube (green, red, blue, orange, yellow centers) under a strong blue cast.
  const faces: RGB[][] = [
    [[180, 46, 78], [220, 104, 88], [144, 165, 254], [197, 234, 146], [24, 192, 159], [176, 237, 135], [12, 195, 114], [3, 70, 224], [179, 236, 142]],
    [[215, 48, 94], [255, 119, 102], [202, 246, 128], [17, 82, 253], [233, 41, 119], [6, 78, 248], [230, 46, 123], [27, 224, 164], [227, 66, 151]],
    [[246, 116, 109], [164, 178, 255], [6, 73, 221], [209, 44, 144], [58, 115, 239], [217, 40, 123], [202, 248, 137], [195, 252, 149], [195, 248, 152]],
    [[232, 112, 107], [169, 41, 63], [31, 189, 112], [203, 242, 156], [255, 119, 154], [253, 111, 140], [253, 112, 112], [252, 113, 116], [153, 174, 253]],
    [[246, 124, 109], [167, 183, 254], [11, 80, 232], [13, 82, 251], [207, 255, 161], [167, 184, 255], [16, 227, 150], [29, 223, 170], [13, 218, 170]],
  ];
  // The user and the room behind, captured by mistake.
  const people: RGB[][] = [
    [[166, 153, 135], [159, 126, 118], [217, 198, 176], [175, 126, 138], [136, 92, 121], [223, 205, 185], [104, 107, 141], [95, 97, 128], [205, 187, 165]],
    [[198, 180, 157], [126, 114, 98], [129, 101, 95], [205, 188, 167], [125, 110, 97], [109, 74, 117], [186, 169, 147], [87, 85, 108], [56, 53, 75]],
  ];
  for (const f of faces) assert.ok(f.filter(vivid).length >= 4, `cube ${f[4]}`);
  for (const f of people) assert.ok(f.filter(vivid).length < 4, `person ${f[4]}`);
});
