# Adding a fuel technology

Adding a `fueltech_id` must update every representation used by the UI. Missing
one causes silent fallbacks such as grey colours, raw codes, or absent chart
series.

## Decide the classification

Record the lowercase snake_case code returned by the OE API, display name, hex
colour, parent group, whether it is renewable, and whether it represents a load.
Match the closest existing sibling rather than inventing a new convention.

## Update the relevant mappings

1. Add a colour in `src/lib/theme/openelectricity.js`.
2. Add the display name in `src/lib/fuel_techs.js`; add loads to `loadFuelTechs`.
3. Update only the relevant grouping maps in `src/lib/fuel-tech-groups/`:
   simple, detailed, renewables/fossils, sources/loads, and any lens or scenario
   grouping where the closest sibling appears.
4. For a generating technology, check `src/lib/seo/facility-jsonld.js`. Verify
   any Wikidata QID against Wikidata's English entity label before adding it.
5. Add a fuel-tech icon only when an approved SVG asset is available; do not
   invent an icon that does not match the existing set.

## Verify

- Run `pnpm run check`.
- Search for the new code and confirm it appears in the colour map, name map,
  and an appropriate grouping.
- Manually check a chart or facility view that renders the new technology.
