# Signal, Edit, Support

A Cloudflare Pages activity for a live class debate.

## What the activity does

Participants chat with a digital friend for three short turns. Their responses are turned into:

- a stance number
- a one-line summary
- a short public excerpt from what they wrote
- two balanced debate teams

The app is designed around three linked lenses:

1. **Signal** — what makes a short public update useful during a fast-moving event
2. **Edit** — how Wikipedia-style collaboration improves quality only when coordination exists
3. **Support** — how close ties, weak ties, and bounded visibility shape help and trust

The debate prompt is:

> In a fast-moving community event, should the system prioritize open signaling and broad participation, or tighter coordination and selective visibility?

## What to say in class

Students use one shared scenario. The first turn asks what kind of public signal helps people understand what is happening. The second turn asks how a shared page should be coordinated so crowd contribution improves quality instead of causing chaos. The third turn asks which ties matter first and what should stay public or bounded. After the chat, everyone sees names and short public excerpts on the live wall, then the facilitator builds two equal-size teams for the debate.

## Project structure

- `public/index.html` participant page
- `public/facilitator.html` facilitator dashboard
- `functions/api/chat.js` digital friend chat replies
- `functions/api/submit.js` evaluation and save
- `functions/api/state.js` live participant wall
- `functions/api/assign.js` balanced team builder
- `functions/api/reset.js` clear session
- `lib/evaluator.js` deterministic scoring + public excerpt
- `schema.sql` D1 schema

## Local setup

```bash
npm install
npx wrangler login
npx wrangler d1 create cscw_signal_steward
```

Copy the real database UUID from the command output into `wrangler.jsonc` as `database_id`.

Then initialize the schema:

```bash
npx wrangler d1 execute cscw_signal_steward --file=schema.sql --remote
```

Run locally:

```bash
npm run dev
```

## Deploy

Create the Pages project once:

```bash
npx wrangler pages project create cscw-signal-steward-activity
```

Deploy:

```bash
npm run deploy
```

## Fix for the exact error you saw

If Cloudflare says:

> Error 8000022: Invalid database UUID

then the value in `wrangler.jsonc` is still a placeholder or the wrong D1 UUID. Replace:

```jsonc
"database_id": "YOUR_REAL_D1_DATABASE_UUID_HERE"
```

with the real UUID returned by:

```bash
npx wrangler d1 create cscw_signal_steward
```

or by:

```bash
npx wrangler d1 info cscw_signal_steward
```

Do not use a sample UUID such as `12345678-abcd-1234-abcd-1234567890ab`.

## Classroom flow

1. Share the participant page.
2. Students enter names and answer three prompts.
3. Each result is saved and shown on the live wall.
4. Open `/facilitator.html`.
5. Click **Build balanced teams**.
6. Each team chooses one spokesperson and debates the prompt.
