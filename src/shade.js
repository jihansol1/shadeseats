export function buildSections(venue, levels, compassZones) {
  const slice = 360 / compassZones.length;
  const sections = [];

  levels.forEach((level) => {
    compassZones.forEach((zoneName, zoneIndex) => {
      const startAngle = zoneIndex * slice - slice / 2;
      const endAngle = zoneIndex * slice + slice / 2;
      const centerAngle = normalizeDegrees((startAngle + endAngle) / 2);
      const westCanopyBoost = venue.id === "dignity-health-sports-park" && angularDiff(centerAngle, 270) < 65 ? 0.26 : 0;
      const baseballHomePlateBoost = venue.fieldType === "baseball" && angularDiff(centerAngle, 180) < 42 ? 0.08 : 0;

      sections.push({
        id: `${venue.id}-${level.id}-${zoneIndex}`,
        name: `${zoneName} ${level.label}`,
        level: level.id,
        startAngle,
        endAngle,
        centerAngle,
        innerRadius: level.innerRadius,
        outerRadius: level.outerRadius,
        baseCover: clamp(venue.coverByLevel[level.id] + westCanopyBoost + baseballHomePlateBoost, 0, 0.86),
      });
    });
  });

  return sections;
}

export function scoreSection(section, sun, venue) {
  if (sun.elevation <= 0) {
    return {
      ...section,
      shadeScore: 1,
      status: "shade",
      glare: "No direct sun",
    };
  }

  const sectionBearing = normalizeDegrees(section.centerAngle + venue.rotation);
  const shadowBearing = normalizeDegrees(sun.azimuth + 180);
  const shadowAlignment = 1 - clamp(angularDiff(sectionBearing, shadowBearing) / 58, 0, 1);
  const lowSunFactor = clamp((38 - sun.elevation) / 38, 0, 1);
  const rimShade = shadowAlignment * lowSunFactor * venue.rimStrength;
  const coverShade =
    section.level === "upper"
      ? section.baseCover
      : section.baseCover * clamp((55 - sun.elevation) / 55, 0.24, 1);
  const shadeScore = clamp(Math.max(coverShade, rimShade) + 0.18 * Math.min(coverShade, rimShade), 0, 1);

  const fanFacing = normalizeDegrees(sectionBearing + 180);
  const faceAngle = angularDiff(fanFacing, sun.azimuth);
  const glare =
    faceAngle < 45 && sun.elevation > 5
      ? "Sun in face"
      : faceAngle < 85 && sun.elevation > 5
        ? "Side sun"
        : "Sun behind";

  return {
    ...section,
    shadeScore,
    status: shadeScore >= 0.68 ? "shade" : shadeScore >= 0.38 ? "mixed" : "sun",
    glare,
  };
}

export function scoreSections(sections, sun, venue) {
  return sections.map((section) => scoreSection(section, sun, venue));
}

export function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

export function angularDiff(a, b) {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return Math.min(diff, 360 - diff);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
