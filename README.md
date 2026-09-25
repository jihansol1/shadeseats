# ShadeSeats

ShadeSeats is an early static MVP for checking whether stadium sections are likely to be shaded or exposed to sun during a baseball or soccer event in the Los Angeles area.

This branch focuses on a section-level prototype:

- choose an LA-area venue
- set event date, start time, and duration
- scrub through the event timeline
- inspect sections marked as sun, mixed, or shade
- view the best shaded sections for the selected time

## Included Venues

- Dodger Stadium
- Angel Stadium
- BMO Stadium
- Dignity Health Sports Park
- Rose Bowl

## Run Locally

Because this is a static MVP, you can open `index.html` directly in a browser.

To serve it locally:

```bash
python3 -m http.server 4173
```

Then visit:

```text
http://localhost:4173
```

## Docker

Build and run the Nginx container:

```bash
docker build -t shadeseats-static-mvp .
docker run --rm -p 8080:80 shadeseats-static-mvp
```

Then visit:

```text
http://localhost:8080
```

## MVP Accuracy Note

This version uses approximate section geometry and heuristic shade scoring. It is meant to validate the product experience before investing in row-level or seat-level stadium geometry.

The core accuracy upgrades after this branch are:

- real section names and section boundaries
- row-level geometry
- roof and canopy meshes
- backend-calculated shade maps
- cached event-time shade forecasts
