const DEG = Math.PI / 180;

export function getSunPosition(localTime, latitude, longitude) {
  const date = new Date(Date.UTC(localTime.year, localTime.month - 1, localTime.day));
  const yearStart = new Date(Date.UTC(localTime.year, 0, 0));
  const dayOfYear = Math.floor((date - yearStart) / 86400000);
  const localMinutes = localTime.hour * 60 + localTime.minute;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (localMinutes / 60 - 12) / 24);

  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const timezoneOffset = getPacificOffsetHours(localTime.year, localTime.month, localTime.day);
  const trueSolarTime = wrap(localMinutes + equationOfTime + 4 * longitude - 60 * timezoneOffset, 1440);
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180;

  const latitudeRad = latitude * DEG;
  const hourAngleRad = hourAngle * DEG;
  const cosZenith = clamp(
    Math.sin(latitudeRad) * Math.sin(declination) +
      Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngleRad),
    -1,
    1,
  );
  const zenith = Math.acos(cosZenith);
  const elevation = 90 - zenith / DEG;
  const azimuthDenominator = Math.cos(latitudeRad) * Math.sin(zenith);

  let azimuth = 180;
  if (Math.abs(azimuthDenominator) > 0.001) {
    const azimuthRad = Math.acos(
      clamp((Math.sin(latitudeRad) * Math.cos(zenith) - Math.sin(declination)) / azimuthDenominator, -1, 1),
    );
    azimuth = hourAngle > 0 ? (azimuthRad / DEG + 180) % 360 : (540 - azimuthRad / DEG) % 360;
  }

  return { elevation, azimuth };
}

export function getPacificOffsetHours(year, month, day) {
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  }).formatToParts(noonUtc);
  const offsetText = parts.find((part) => part.type === "timeZoneName")?.value || "GMT-8";
  const match = offsetText.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);

  if (!match) return -8;

  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0) / 60;
  return hours < 0 ? hours - minutes : hours + minutes;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrap(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}
