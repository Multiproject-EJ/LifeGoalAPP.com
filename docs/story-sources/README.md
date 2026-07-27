# Story Sources — raw import inbox (NOT canon)

This tree is the landing zone for story/design material imported from outside
the repository: ChatGPT conversations, Codex CLI sessions, Claude chats, notes.

## The three-tier rule

| Tier | Where | Status |
|---|---|---|
| 1. Raw | `docs/story-sources/<source>/raw/**` | **Never canon.** Unedited transcripts. Evidence, not decisions. |
| 2. Curated | A dated distillation doc (e.g. `docs/gameplay/approved-story-concepts-YYYY-MM-DD.md`) | Decisions extracted from raw batches, with conflicts against existing canon called out explicitly. |
| 3. Canon | Story bibles, narrative contracts, and runtime definitions under `src/` | Wins every conflict. Gameplay contracts (`docs/gameplay/CANONICAL_GAMEPLAY_CONTRACT.md` etc.) outrank story entirely. |

Rules that keep the story from drifting:

1. Nothing in `raw/` may be cited as a decision. If an idea matters, it gets
   promoted through a curated doc that names what it supersedes or conflicts
   with (see `docs/gameplay/approved-story-concepts-2026-07-07.md` for the
   pattern).
2. Imports are additive and idempotent — the ingest script never edits or
   deletes an existing raw file, and re-running it only adds new material.
3. The repository is the single home for canon. Local machines and chat
   accounts are inputs (an inbox), never a second source of truth.

## Layout

```text
docs/story-sources/
  README.md                  ← this file
  .ingest-index.json         ← conversation-id → file map (dedupe; committed)
  chatgpt/raw/               ← from ChatGPT data export (conversations.json)
    dual-engine/             ← pre-pipeline manual pastes (migrated from docs/gptchats)
  codex/raw/                 ← from Codex CLI session logs (~/.codex/sessions)
```

## How to import

### ChatGPT

1. In ChatGPT: Settings → Data Controls → Export Data. Unzip the emailed
   archive; it contains `conversations.json`.
2. Run (from the repo root):

   ```bash
   node scripts/ingest-chat-exports.mjs --chatgpt /path/to/conversations.json
   ```

   You can also point `--chatgpt` at the unzipped export folder.

### Codex CLI

Codex CLI stores sessions on the machine that ran them (default
`~/.codex/sessions`, one JSONL file per session):

```bash
node scripts/ingest-chat-exports.mjs --codex ~/.codex/sessions
```

Codex *web* tasks are not covered by either path — capture those manually
(paste into `docs/story-sources/codex/raw/manual/`) or via a browser-driving
session.

### Options

- Both flags can be combined in one run.
- `--keywords island,noctyra,...` overrides the default story keyword filter;
  `--all` imports every conversation regardless of keywords.
- `--dry-run` prints what would be written without touching files.
- `--out <dir>` changes the output root (default `docs/story-sources`).

Matching is case-insensitive against the conversation title + full text. The
default keyword list lives at the top of `scripts/ingest-chat-exports.mjs`.

Re-runs are cheap: `.ingest-index.json` tracks imported conversation ids, so a
fresh export only adds conversations that are new (or updated since the last
import — updated ones are rewritten in place).

## After importing

Ask for a distillation pass over the new batch: read the raw files, compare
against the story bible and existing canon, and produce a curated doc that
sorts each idea into **new canon candidate**, **conflicts with canon**, or
**duplicate/already shipped**. Only that curated doc — never the raw
transcript — feeds runtime narrative work.
