const DATA_FILES = {
  compassZones: "./data/compass-zones.json",
  levels: "./data/section-levels.json",
  venues: "./data/venues.json",
};

export async function loadAppData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`Could not load ${path}: ${response.status}`);
      }

      return [key, await response.json()];
    }),
  );

  return Object.fromEntries(entries);
}
