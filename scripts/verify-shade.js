import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildSections, scoreSection, scoreSections } from "../src/shade.js";

const [venues, levels, compassZones] = await Promise.all([
  readJson("data/venues.json"),
  readJson("data/section-levels.json"),
  readJson("data/compass-zones.json"),
]);

const dodger = venues.find((venue) => venue.id === "dodger-stadium");
const sections = buildSections(dodger, levels, compassZones);
const expectedSectionCount = levels.length * compassZones.length;

assert.equal(sections.length, expectedSectionCount);
assert.equal(sections[0].name, "North Lower");
assert.ok(sections.every((section) => section.baseCover >= 0 && section.baseCover <= 0.86));

const nightScore = scoreSection(sections[0], { elevation: -8, azimuth: 290 }, dodger);
assert.equal(nightScore.status, "shade");
assert.equal(nightScore.shadeScore, 1);
assert.equal(nightScore.glare, "No direct sun");

const middayScores = scoreSections(sections, { elevation: 72, azimuth: 190 }, dodger);
assert.equal(middayScores.length, expectedSectionCount);
assert.ok(middayScores.some((section) => section.status === "sun"));
assert.ok(middayScores.every((section) => section.shadeScore >= 0 && section.shadeScore <= 1));

const lowSunScores = scoreSections(sections, { elevation: 10, azimuth: 260 }, dodger);
assert.ok(lowSunScores.some((section) => section.status === "mixed" || section.status === "shade"));
assert.ok(lowSunScores.some((section) => section.glare === "Sun in face" || section.glare === "Side sun"));

console.log("Shade scoring verification passed.");

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}
