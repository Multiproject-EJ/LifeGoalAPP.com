# Handover — extract story material from ChatGPT/Codex chats (run on the Mac)

Audience: a Claude session running locally on the owner's Mac (Cowork/desktop,
any account) with browser access and file access. This document is
self-contained — no prior conversation context is needed.

## Mission

The owner has story/design material for this app's island game scattered
across old ChatGPT conversations and Codex CLI sessions. Find the relevant
chats, extract **only** the game-related content, and save it into this
repository's story-sources inbox so a later distillation pass can promote the
good ideas into canon.

This is selective extraction, not a bulk archive. Open one chat at a time;
never export or copy anything unrelated to the game.

## Context you need (60 seconds)

- The app is LifeGoalAPP / HabitGame: a life-goals + habits app wrapped in an
  island board game ("Island Run", 120 islands, the Great Drift, guardians
  like Noctyra, The Concord translator device, the Compass Book).
- Existing canon lives in `docs/gameplay/` (story bibles, contracts) and
  `src/features/gamification/level-worlds/narrative/` (runtime definitions).
  **Do not edit any of those.** Your output is raw source material only.
- The pipeline rules are in `docs/story-sources/README.md`: raw → curated →
  canon. Everything you produce is tier 1 (raw) and must be marked as such.

## Setup

1. Work in a local clone of `Multiproject-EJ/LifeGoalAPP.com`
   (`git clone https://github.com/Multiproject-EJ/LifeGoalAPP.com.git` if
   absent — ask the owner to handle GitHub auth if the clone/push fails).
2. Check out the branch `claude/lifegoalapp-habitgame-storyline-t9edy9`
   (create it tracking origin if needed). Pull latest first.
3. Confirm `docs/story-sources/README.md` exists on the branch — if it
   doesn't, you're on the wrong branch.

## Task A — ChatGPT (browser, selective)

With the owner logged in to chatgpt.com, use ChatGPT's own search box for
these terms, one at a time:

```text
island game story        Noctyra            Great Drift
Luma Isle                prophecy villain   The Last Word
caretaker island         Concord            habit game story
island boss              120 islands        storywriter
compass book             hatchery egg game  guardian frozen
```

Add obvious variants if hits suggest them. For each search hit:

1. Open the conversation and skim it. Relevant = story, characters, lore,
   island concepts, villains, dialogue drafts, game-narrative mechanics,
   ethics/design of the story system. Not relevant = coding help, personal
   topics, unrelated products. When a chat is mixed, extract only the
   relevant parts.
2. Save each relevant chat as one file:
   `docs/story-sources/chatgpt/raw/manual/<YYYY-MM-DD>-<short-slug>.md`
   (date = the conversation's date if visible, otherwise today).
3. Start every file with this header, then the extracted content with
   `## User` / `## Assistant` sections:

   ```markdown
   # <Conversation title>

   - Source: chatgpt (manual browser extraction)
   - Extracted: <ISO date> on the owner's Mac
   - Search term that found it: <term>
   - Status: RAW IMPORT — not canon. See docs/story-sources/README.md.
   - Omissions: <"none" or a note like "skipped unrelated CSS discussion">

   ---
   ```

4. Long chats: scroll to load the full history before extracting. Preserve
   the owner's own words verbatim where possible — their phrasing is the
   valuable part.

## Task B — Codex CLI sessions (files, no browser)

1. Look in `~/.codex/sessions/` (JSONL files, possibly in dated subfolders).
   If the folder doesn't exist, note that and move on.
2. Grep the files for the same story terms. For each session with relevant
   content, extract the user/assistant turns into
   `docs/story-sources/codex/raw/manual/<YYYY-MM-DD>-<short-slug>.md` with the
   same header format (Source: codex CLI session, plus the source filename).
3. Alternatively, `scripts/ingest-chat-exports.mjs --codex ~/.codex/sessions`
   automates this — feel free to use it (it filters by story keywords and
   writes into `docs/story-sources/codex/raw/`).

## Hard rules

- **Extract-only.** Do not edit canon docs, runtime code, or anything outside
  `docs/story-sources/`.
- **Selective.** Nothing personal, financial, or off-topic enters the repo —
  even inside an otherwise relevant chat. Record what you skipped in the
  `Omissions` header line.
- **Verbatim over summary.** Raw tier stores what was actually said;
  summarizing happens later, in the distillation pass.
- **No canon decisions.** If you notice a conflict with existing story docs,
  note it in the file's header (`- Possible canon conflict: ...`) — do not
  resolve it.

## Finish

1. `git add docs/story-sources/ && git commit` with message
   `Import story-source chats extracted on Mac (<n> chatgpt, <m> codex)`.
2. `git push -u origin claude/lifegoalapp-habitgame-storyline-t9edy9`.
3. Report to the owner: how many chats were checked, extracted, and skipped;
   which search terms found nothing; any chats too long/broken to extract
   (list them so a follow-up can get them); any possible canon conflicts
   spotted.

The next step after this handover (owner will trigger it separately): a
distillation pass comparing the new raw batch against the story bible.
