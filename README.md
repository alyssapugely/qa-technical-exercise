# Movie Collection Curator

Create named collections, search TMDB to fill them, annotate each film *within* a
collection with a note, tags and a rating, and see what the collection adds up to.

Three deliverables in one npm workspace:

| Package | What it is |
| --- | --- |
| `packages/tmdb` | A hand-written TMDB client. No third-party TMDB library. |
| `apps/api` | Express + Prisma + Postgres. The browser never talks to TMDB. |
| `apps/web` | React SPA, Vite, TanStack Query. |

## Running it

You need Node 20.19+, Docker (for the database only), and a **TMDB v4 read access
token** — the long JWT under [Settings → API](https://www.themoviedb.org/settings/api),
labelled *API Read Access Token*. Not the v3 API key.

```bash
cp .env.example .env    # paste your token into TMDB_READ_TOKEN
npm install
npm run setup           # starts Postgres, runs migrations, seeds users and collections
npm run dev             # API on :4000, app on http://localhost:5173
```

Open <http://localhost:5173>. `GET http://localhost:4000/health` returns
`{"status":"ok"}` once the API is up.

Optional configuration overrides are listed in `.env.example`.

### What the seed gives you

Two users in the header switcher, with fixed ids so they survive a reset:

| User | Id |
| --- | --- |
| Sam | `11111111-1111-4111-8111-111111111111` |
| Alex | `22222222-2222-4222-8222-222222222222` |

Sam owns two collections: **Rainy Sunday**
(`44444444-4444-4444-8444-444444444444`), six films with notes, tags and ratings
already on them, and **Films I Should Have Seen By Now**
(`33333333-3333-4333-8333-333333333333`), which is empty. Alex starts with
nothing, so switching users shows the empty state.

The demo films are written straight to the database rather than fetched, so
seeding needs no token and no network. Two of the six snapshots are incomplete —
one has no runtime, one has no release date — because that is what a snapshot
looks like when TMDB was missing a field on the day it was taken.

`npm run db:reset` drops everything, replays the migrations and re-seeds.

Other scripts: `npm test`, `npm run typecheck`, `npm run lint`, `npm run db:studio`,
and `npm run smoke -w @curator/tmdb -- "seven samurai"` to hit the real TMDB API
directly.

## Shape of it

```
packages/tmdb/src/
  client.ts      one request helper: auth, query building, status -> typed error
  schemas.ts     Zod schemas for raw TMDB payloads, snake_case intact
  mappers.ts     the only file that knows TMDB's vocabulary
  errors.ts      TmdbAuthError, TmdbRateLimitError, TmdbResponseError, ...

apps/api/src/
  routes/        thin: parse with Zod, call a service, serialise
  services/      collections, movies (add/remove/annotate), tmdb (cached)
  stats.ts       pure computeStats(items) - no Prisma import
  serialize.ts   the wire contract; Prisma models are never returned directly
  middleware/    currentUser (scoping), errorHandler (one envelope)

apps/web/src/
  api.ts         typed fetch wrapper, injects X-User-Id, throws ApiError
  components/    CollectionList, CollectionView, MovieSearch, FilmRow, StatsPanel
```

### API

Everything except `GET /api/users` requires an `X-User-Id` header and is scoped by
it. There is no authentication: the header names the user, the API looks them up,
and every read and write is filtered to that user.

```
GET    /health
GET    /api/users
GET    /api/collections
POST   /api/collections                        { name }
GET    /api/collections/:id                    -> collection + items + stats
PATCH  /api/collections/:id                    { name }
DELETE /api/collections/:id
POST   /api/collections/:id/movies             { tmdbId }
PATCH  /api/collections/:id/movies/:itemId     { note?, tags?, rating? }
DELETE /api/collections/:id/movies/:itemId
GET    /api/movies/search?q=&page=
```

Failures all look the same: `{ "error": { "code": "...", "message": "..." } }`.

Validation, briefly: a collection name is trimmed and must be 1–120 characters;
a note is trimmed and must be 2000 characters or fewer; there can be at most 20
tags, each 40 characters or fewer, and they are lowercased and deduplicated on
write; a rating is a whole number from 1 to 5. A `PATCH` to an annotation must
carry at least one of `note`, `tags` or `rating`. Deletes return `204`.

### Stats

Returned inside `GET /api/collections/:id`, computed from the same items the
response already carries, so the panel can never disagree with the list beside it.

- **Films** — how many films the collection holds.
- **Runtime** — the total is the sum over films whose runtime TMDB knew. The
  average is that total divided by the number of films with a *known* runtime,
  rounded to the nearest minute. Films with an unknown runtime are reported
  separately and excluded from both numbers.
- **Rating** — the average across the films **you have rated**, to one decimal,
  shown together with how many films that average covers. Unrated films are
  excluded from the average; they are not counted as zero.
- **Genres** — one count per film per genre, so a film with three genres adds one
  to each. The counts therefore add up to more than the number of films. Sorted
  by count, then by name.
- **Release years** — the earliest and latest year in the collection, plus a
  count per decade. Films with no release date are excluded, so the decade counts
  can add up to fewer films than the collection holds.

Showing "2.5 across 3 of 7 rated" rather than a bare 2.5 was deliberate: an
average over an unstated denominator is a number pretending to be a fact.

---

## Decision log

**Snapshot TMDB fields when a film is added, rather than fetching live.**
On add, the API calls `/movie/{id}`, copies title, overview, poster path, release
date, runtime and genres into Postgres, and stamps `fetchedAt`. Rendering a
collection and computing its stats then touch TMDB zero times.

The cost is staleness: if a film's runtime is corrected on TMDB, my copy stays
wrong until something re-adds that film. I traded correctness for latency and
request budget. The alternative, fetching live on every collection view, makes
stats N API calls and puts a rate limit between the user and their own page.

**REST rather than GraphQL.**
GraphQL is the better fit for the *shape* here: collection → items → movie →
genres is exactly what it's for. I picked REST because there are nine endpoints
and one nested read, and at that size the schema-and-resolver layer is ceremony
that buys nothing back inside the time available. What I gave up is the thing I'd
actually want at scale — clients asking for only the fields they need, instead of
the collection endpoint always shipping every annotation and genre.

**The annotation lives on the membership row, not in its own table.**
`CollectionItem` carries `collectionId`, `movieId`, `note`, `tags`, `rating`. The
annotation is 1:1 with membership by definition, so a separate table would always
hold exactly one row per item. The composite unique key on
`(collectionId, movieId)` is what gives the brief's "same film, two collections,
different annotations" for free.

What I gave up: annotations are owned *transitively*, via the collection's owner.
That reads "user-owned annotations" as "collections have one owner". If
collections were ever shared between users, annotations would need their own
`userId` and this row would have to split.

## Known issues

- **No deep links and no browser back.** Views are internal state rather than
  routes, so the URL never changes and reloading returns you to the collections
  list. A router is the first thing I'd add.
- **Search stops at page one.** The API takes and validates a `page` parameter;
  the UI never sends one, so you only ever see the first twenty results.
- **`window.confirm` for destructive actions.** Blunt and unstyleable. It's there
  because a real confirmation dialog was time I'd rather have spent elsewhere.

## Testing
### API Integration Tests

The API integration tests use Supertest and the real PostgreSQL database. The PostgreSQL Docker container must remain running while the tests execute. The API server does not need to be started separately because the tests imports the Express app directly.

To run all tests:
```bash
cp .env.example .env    # paste your token into TMDB_READ_TOKEN
npm install  
npm run setup
npm run test:api:integration
``` 

To run a single test file:
```bash
npm run test -w @curator/api -- src/tests/integration/{test-file}.test.ts
``` 

### Playwright Tests

To run all Playwright e2e tests, ensure the application is running, then run:
```bash
npx playwright install chromium   # one-time setup
npm run test:e2e # runs headless, OR
npm run test:e2e:headed # runs headed
```

To run a single test file:
```bash
npx playwright test e2e/{test-file}.test.ts
```

To run tests headed:
```bash
npx playwright test --headed
```

To view a failed test trace locally:
```bash
npx playwright show-trace test-results/{test-folder}/trace.zip
```