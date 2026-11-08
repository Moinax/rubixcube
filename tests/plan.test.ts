import assert from "node:assert/strict";
import test from "node:test";
import { STAGES, YELLOW_UP } from "../src/beginner.ts";
import { MILESTONES, PLAN } from "../src/plan.ts";

const shown = (s: string) => [...s].flatMap((c, i) => (c === "." ? [] : [i]));

test("the plan has a milestone and a text per stage, the last one the solved cube", () => {
  assert.equal(PLAN.length, STAGES.length);
  assert.equal(MILESTONES.length, STAGES.length);
  assert.equal(MILESTONES.at(-1), YELLOW_UP);
  for (const p of PLAN.slice(1)) assert.ok(p.look && p.how.length && p.why && p.done);
});

test("from the white cross on, each milestone shows solved pieces only and keeps what the last one showed", () => {
  for (let i = 2; i < MILESTONES.length; i++) {
    // Milestone 7 has its corners placed but twisted, on purpose.
    if (i !== 7) for (const k of shown(MILESTONES[i])) assert.equal(MILESTONES[i][k], YELLOW_UP[k], `milestone ${i}, sticker ${k}`);
    if (i > 2) assert.ok(shown(MILESTONES[i - 1]).every((k) => MILESTONES[i][k] !== "."), `milestone ${i} keeps milestone ${i - 1}`);
  }
});
