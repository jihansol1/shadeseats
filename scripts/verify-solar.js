import assert from "node:assert/strict";
import { getPacificOffsetHours, getSunPosition } from "../src/solar.js";

const dodgerStadium = {
  latitude: 34.0739,
  longitude: -118.24,
};

const summerNoon = getSunPosition(
  { year: 2026, month: 7, day: 1, hour: 13, minute: 0 },
  dodgerStadium.latitude,
  dodgerStadium.longitude,
);
const summerNight = getSunPosition(
  { year: 2026, month: 7, day: 1, hour: 23, minute: 0 },
  dodgerStadium.latitude,
  dodgerStadium.longitude,
);
const winterAfternoon = getSunPosition(
  { year: 2026, month: 1, day: 15, hour: 15, minute: 0 },
  dodgerStadium.latitude,
  dodgerStadium.longitude,
);

assert.equal(getPacificOffsetHours(2026, 7, 1), -7);
assert.equal(getPacificOffsetHours(2026, 1, 15), -8);
assert.ok(summerNoon.elevation > 70, `Expected high summer sun, got ${summerNoon.elevation}`);
assert.ok(summerNight.elevation < 0, `Expected nighttime sun below horizon, got ${summerNight.elevation}`);
assert.ok(winterAfternoon.azimuth > 180 && winterAfternoon.azimuth < 270, `Expected southwest winter afternoon sun, got ${winterAfternoon.azimuth}`);

console.log("Solar engine verification passed.");
