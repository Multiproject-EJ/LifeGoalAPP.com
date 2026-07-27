#!/usr/bin/env node
/**
 * Ingest chat transcripts from external AI tools into docs/story-sources/.
 *
 * Sources:
 *   --chatgpt <path>  ChatGPT data export: conversations.json (or the unzipped
 *                     export folder containing it).
 *   --codex <dir>     Codex CLI session logs (JSONL files, recursive; default
 *                     location on the machine that ran Codex: ~/.codex/sessions).
 *
 * Output: one markdown file per matching conversation under
 *   docs/story-sources/chatgpt/raw/  and  docs/story-sources/codex/raw/
 *
 * Idempotent: docs/story-sources/.ingest-index.json records imported
 * conversation ids; unchanged conversations are skipped on re-runs, updated
 * ones are rewritten in place. The script never deletes raw files.
 *
 * See docs/story-sources/README.md for the raw → curated → canon pipeline.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Default filter: a conversation is imported when title or body matches any keyword. */
const DEFAULT_KEYWORDS = [
  'island', 'noctyra', 'great drift', 'storyline', 'story bible', 'narrative',
  'habitgame', 'habit game', 'lifegoal', 'life goal', 'villain', 'luma',
  'concord', 'prophecy', 'caretaker', 'guardian', 'compass book', 'hatchery',
  'boss', 'creature', 'egg', 'wisdom tree', 'storywriter', 'valence',
];

function parseArgs(argv) {
  const args = { keywords: null, all: false, dryRun: false, out: 'docs/story-sources', chatgpt: null, codex: null };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${flag}`);
      return argv[i];
    };
    if (flag === '--chatgpt') args.chatgpt = next();
    else if (flag === '--codex') args.codex = next();
    else if (flag === '--keywords') args.keywords = next().split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    else if (flag === '--all') args.all = true;
    else if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--out') args.out = next();
    else if (flag === '--help' || flag === '-h') args.help = true;
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

function usage() {
  console.log(`Usage: node scripts/ingest-chat-exports.mjs [--chatgpt <conversations.json|export-dir>] [--codex <sessions-dir>]
                                            [--keywords a,b,c] [--all] [--dry-run] [--out <dir>]`);
}

function slugify(text, fallback) {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || fallback;
}

function isoDate(epochSeconds) {
  if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) return null;
  // ChatGPT exports use float epoch seconds; tolerate milliseconds too.
  const ms = epochSeconds > 1e12 ? epochSeconds : epochSeconds * 1000;
  return new Date(ms).toISOString();
}

function matchesKeywords(haystack, keywords) {
  const lower = haystack.toLowerCase();
  // Keyword must start at a word boundary; suffixes are allowed, so
  // "island" matches "islands" but "boss" no longer matches "embossed".
  return keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}`).test(lower);
  });
}

function renderMarkdown({ title, source, conversationId, createdAt, updatedAt, sourceFile, turns }) {
  const lines = [
    `# ${title || 'Untitled conversation'}`,
    '',
    `- Source: ${source}`,
    `- Conversation ID: ${conversationId}`,
    createdAt ? `- Created: ${createdAt}` : null,
    updatedAt ? `- Updated: ${updatedAt}` : null,
    sourceFile ? `- Source file: ${sourceFile}` : null,
    `- Imported: ${new Date().toISOString()} by scripts/ingest-chat-exports.mjs`,
    '- Status: RAW IMPORT — not canon. See docs/story-sources/README.md.',
    '',
    '---',
    '',
  ].filter((line) => line !== null);
  for (const turn of turns) {
    const speaker = turn.role === 'user' ? 'User' : turn.role === 'assistant' ? 'Assistant' : turn.role;
    lines.push(`## ${speaker}`, '', turn.text.trim(), '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

// ---------------------------------------------------------------------------
// ChatGPT export (conversations.json)
// ---------------------------------------------------------------------------

/** Pull plain text out of a ChatGPT message node; returns '' for non-text/system noise. */
function chatgptMessageText(message) {
  if (!message || typeof message !== 'object') return '';
  const role = message.author?.role;
  if (role !== 'user' && role !== 'assistant') return '';
  if (message.metadata?.is_visually_hidden_from_conversation) return '';
  const content = message.content;
  if (!content || typeof content !== 'object') return '';
  const parts = Array.isArray(content.parts) ? content.parts : [];
  if (content.content_type === 'text' || content.content_type === 'multimodal_text') {
    const text = parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('\n');
    return text;
  }
  if (content.content_type === 'code' && typeof content.text === 'string') {
    return `\n\`\`\`\n${content.text}\n\`\`\`\n`;
  }
  return '';
}

/**
 * Rebuild the active thread of a conversation by walking parents up from
 * current_node (the export stores the full branch tree; current_node marks the
 * thread the user last saw).
 */
function chatgptThread(conversation) {
  const mapping = conversation.mapping;
  if (!mapping || typeof mapping !== 'object') return [];
  let nodeId = conversation.current_node;
  if (!nodeId || !mapping[nodeId]) {
    // Fallback: pick any leaf (node that is nobody's parent).
    const parents = new Set(Object.values(mapping).map((node) => node?.parent).filter(Boolean));
    nodeId = Object.keys(mapping).find((id) => !parents.has(id)) ?? null;
  }
  const turns = [];
  const visited = new Set();
  while (nodeId && mapping[nodeId] && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = mapping[nodeId];
    const text = chatgptMessageText(node.message);
    if (text.trim()) turns.push({ role: node.message.author.role, text });
    nodeId = node.parent;
  }
  turns.reverse();
  // Merge consecutive turns from the same role (tool hops collapse away).
  const merged = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) last.text += `\n\n${turn.text}`;
    else merged.push({ ...turn });
  }
  return merged;
}

function loadChatgptConversations(inputPath) {
  let filePath = inputPath;
  if (statSync(filePath).isDirectory()) {
    const candidate = path.join(filePath, 'conversations.json');
    if (!existsSync(candidate)) {
      throw new Error(`No conversations.json found in ${filePath} — point --chatgpt at the unzipped ChatGPT export.`);
    }
    filePath = candidate;
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  const conversations = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.conversations) ? parsed.conversations : null;
  if (!conversations) throw new Error(`${filePath} does not look like a ChatGPT conversations.json export.`);
  return conversations;
}

function ingestChatgpt(inputPath, context) {
  const conversations = loadChatgptConversations(inputPath);
  console.log(`ChatGPT export: ${conversations.length} conversation(s) found.`);
  for (const conversation of conversations) {
    const conversationId = conversation.conversation_id || conversation.id;
    if (!conversationId) continue;
    const turns = chatgptThread(conversation);
    if (turns.length === 0) continue;
    importConversation(context, {
      source: 'chatgpt',
      conversationId: `chatgpt:${conversationId}`,
      title: conversation.title,
      createdAt: isoDate(conversation.create_time),
      updatedAt: isoDate(conversation.update_time),
      sourceFile: null,
      turns,
    });
  }
}

// ---------------------------------------------------------------------------
// Codex CLI sessions (JSONL, format tolerant)
// ---------------------------------------------------------------------------

/** Best-effort extraction of a role+text turn from one Codex JSONL record. */
function codexTurnFromRecord(record) {
  if (!record || typeof record !== 'object') return null;
  // Newer rollout format nests the event under payload; older logs are flat.
  const candidates = [record, record.payload, record.msg, record.message].filter(
    (value) => value && typeof value === 'object',
  );
  for (const candidate of candidates) {
    const role = candidate.role;
    if (role !== 'user' && role !== 'assistant') continue;
    const content = candidate.content;
    if (typeof content === 'string' && content.trim()) return { role, text: content };
    if (Array.isArray(content)) {
      const text = content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
          return '';
        })
        .filter(Boolean)
        .join('\n');
      if (text.trim()) return { role, text };
    }
  }
  return null;
}

function listJsonlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listJsonlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) results.push(full);
  }
  return results;
}

function ingestCodex(sessionsDir, context) {
  const files = listJsonlFiles(sessionsDir);
  console.log(`Codex sessions: ${files.length} JSONL file(s) found under ${sessionsDir}.`);
  for (const file of files) {
    const turns = [];
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let record;
      try {
        record = JSON.parse(trimmed);
      } catch {
        continue; // tolerate partial/corrupt lines
      }
      const turn = codexTurnFromRecord(record);
      if (turn) turns.push(turn);
    }
    if (turns.length === 0) continue;
    const base = path.basename(file, '.jsonl');
    const stats = statSync(file);
    importConversation(context, {
      source: 'codex',
      conversationId: `codex:${base}`,
      title: turns.find((turn) => turn.role === 'user')?.text.split('\n')[0]?.slice(0, 80) || base,
      createdAt: stats.birthtime?.toISOString?.() ?? null,
      updatedAt: stats.mtime?.toISOString?.() ?? null,
      sourceFile: base,
      turns,
    });
  }
}

// ---------------------------------------------------------------------------
// Shared import path (filter → dedupe → write)
// ---------------------------------------------------------------------------

function importConversation(context, conversation) {
  const { index, keywords, all, dryRun, outRoot, counters } = context;
  const fullText = `${conversation.title || ''}\n${conversation.turns.map((turn) => turn.text).join('\n')}`;
  if (!all && !matchesKeywords(fullText, keywords)) {
    counters.filtered += 1;
    return;
  }
  const existing = index.conversations[conversation.conversationId];
  if (existing && existing.updatedAt === conversation.updatedAt) {
    counters.skipped += 1;
    return;
  }

  let relPath = existing?.file;
  if (!relPath) {
    const datePrefix = (conversation.createdAt || new Date().toISOString()).slice(0, 10);
    const slug = slugify(conversation.title, conversation.conversationId.split(':').pop().slice(0, 12));
    relPath = path.join(conversation.source, 'raw', `${datePrefix}-${slug}.md`);
    let attempt = 2;
    while (
      Object.values(index.conversations).some((entry) => entry.file === relPath)
      || (existsSync(path.join(outRoot, relPath)) && !existing)
    ) {
      relPath = path.join(conversation.source, 'raw', `${datePrefix}-${slug}-${attempt}.md`);
      attempt += 1;
    }
  }

  const absPath = path.join(outRoot, relPath);
  const markdown = renderMarkdown(conversation);
  if (dryRun) {
    console.log(`[dry-run] would write ${absPath} (${conversation.turns.length} turns) — ${conversation.title || 'untitled'}`);
  } else {
    mkdirSync(path.dirname(absPath), { recursive: true });
    writeFileSync(absPath, markdown, 'utf8');
    index.conversations[conversation.conversationId] = {
      file: relPath,
      title: conversation.title || null,
      updatedAt: conversation.updatedAt || null,
      importedAt: new Date().toISOString(),
    };
  }
  counters[existing ? 'updated' : 'imported'] += 1;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || (!args.chatgpt && !args.codex)) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const outRoot = path.resolve(args.out);
  const indexPath = path.join(outRoot, '.ingest-index.json');
  const index = existsSync(indexPath)
    ? JSON.parse(readFileSync(indexPath, 'utf8'))
    : { version: 1, conversations: {} };
  if (!index.conversations || typeof index.conversations !== 'object') index.conversations = {};

  const context = {
    index,
    keywords: args.keywords ?? DEFAULT_KEYWORDS,
    all: args.all,
    dryRun: args.dryRun,
    outRoot,
    counters: { imported: 0, updated: 0, skipped: 0, filtered: 0 },
  };

  if (args.chatgpt) ingestChatgpt(path.resolve(args.chatgpt), context);
  if (args.codex) ingestCodex(path.resolve(args.codex), context);

  if (!args.dryRun) {
    mkdirSync(outRoot, { recursive: true });
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  }

  const { imported, updated, skipped, filtered } = context.counters;
  console.log(`Done. ${imported} imported, ${updated} updated, ${skipped} unchanged, ${filtered} filtered out by keywords.`);
  if (filtered > 0 && !args.all) {
    console.log('Tip: pass --all to import everything, or --keywords to adjust the filter.');
  }
}

main();
