# Fixtures

Saved API responses so tests never hit the network.

- `*.sample.json`: hand-written from each source's documentation. They pin
  down edge cases (missing salary, non-remote, malformed posting).
- `*.json` (no `.sample`): real responses downloaded with
  `npm run fixtures:fetch`. `tests/unit/real-fixtures.test.ts` checks that
  every adapter can parse them.
