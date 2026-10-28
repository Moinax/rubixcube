import assert from "node:assert/strict";
import test from "node:test";
import { pickLang } from "../src/i18n.ts";

test("pickLang takes the first supported language, the saved choice first, else English", () => {
  assert.equal(pickLang([null, "nl-BE", "fr"]), "nl");
  assert.equal(pickLang(["fr", "nl-BE"]), "fr");
  assert.equal(pickLang(["xx", "de-DE", "EN-gb"]), "en");
  assert.equal(pickLang([null, "de-DE"]), "en");
});
