# <img src="https://img.shields.io/badge/SAM-v1.0-blue?style=for-the-badge" alt="SAM v1.0" /> Serialized Abstraction Machine

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)]()
[![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple)]()
[![Claude Code](https://img.shields.io/badge/Claude%20Code-2.0%2B-orange)]()

---

## Support SAM

SAM is free and open source, but it takes real time and effort to maintain and improve. If SAM saves you tokens and money, consider giving back — even **$10 makes a huge difference** and helps keep the project alive with new features.

### Donate Directly

| Network | Address |
|---------|---------|
| **EVM** (Ethereum, Base, Arbitrum, Polygon, etc.) | `0x72D33321a92a6051d82C75657aF4d78B849970Bb` |
| **Bitcoin** | `bc1qcx8hdggxkczh7uu6qfwhc6gzvtzs558pchqzqy` |

### Patreon

Support monthly at [patreon.com/0zMoonStarz](https://www.patreon.com/c/0zMoonStarz):

| Tier | $/mo | |
|------|:----:|---|
| **Token Saver** | $5 | You're compressing the universe, one token at a time |
| **Context Keeper** | $10 | Your memory persists across sessions (and so does SAM's) |
| **Alias Master** | $20 | You've been registered as `$LEGEND` in our dictionary |
| **Protocol Architect** | $50 | You write the rules. SAM follows them |

Every dollar goes directly to maintaining SAM, shipping new features, and keeping it free for everyone.

---

## Install

**Requirements:** [Node.js](https://nodejs.org) >= 18 + [Claude Code](https://docs.anthropic.com/en/docs/claude-code) >= 2.0

### Linux / macOS

```bash
sudo npm install -g github:0xMoonStarz/SAM
sam install
```

### Windows (CMD or PowerShell as Administrator)

```cmd
npm install -g github:0xMoonStarz/SAM
sam install
```

### After install

Restart Claude Code. SAM is now active. That's it.

`sam install` does two things:
1. **Registers the MCP server globally** in `~/.claude/settings.json` — works in every project, no per-project setup
2. **Creates/appends** the compression protocol to the current project's `CLAUDE.md`

### Verify

```bash
sam --help          # CLI is working
sam dict            # Show persisted dictionary
sam presets          # Show available framework presets
```

### Uninstall

```bash
sam uninstall
sudo npm uninstall -g sam-cc    # Linux/macOS
npm uninstall -g sam-cc         # Windows
```

---

## What is SAM?

SAM is an **MCP server + behavioral protocol** that reduces Claude Code token usage by **3-30x**. It works by changing *how Claude communicates internally* — not a text compressor, but an abstraction machine that eliminates redundancy at the source.

```
                    ┌──────────────────┐
  Your prompt ───>  │    Claude Code   │
                    │  + SAM Protocol  │  ← Claude thinks in compressed form
                    │  + SAM MCP       │  ← Tools return compressed results
                    └──────────────────┘
                           │
                    Normal responses to you
                    (SAM is invisible to the user)
```

**SAM is 100% open source under the MIT license.** Fork it, modify it, distribute it, use it commercially — no restrictions.

---

## The Problem

Claude Code is verbose by default. Every interaction burns tokens on:

| Waste | Example | Impact |
|-------|---------|--------|
| Filler text | *"Let me read the file...", "Done! I've successfully..."* | 30-50% of output tokens |
| Repeated paths | `/home/user/my-project/src/components/Header.tsx` x5 | 5-15% of context |
| Redundant content | Pasting back file contents already in context | 10-30% of context |
| Verbose confirmations | *"I have successfully updated the file"* vs `~` | 80-90% waste per confirmation |
| Subagent overhead | Each subagent repeats all the same verbosity | Multiplied across agents |

**In a typical session, 40-80% of tokens are wasted.** SAM eliminates this.

---

## Before & After

**Without SAM** (~165 tokens):
```
Let me read the file to understand the structure.
[Read /home/user/project/src/components/Header.tsx]
Ok, I can see the Header component exports a default function.
Now let me search for all imports of this component.
[Grep "Header" /home/user/project/src/ *.tsx]
Found 3 files that import Header. I'll update the first one.
[Edit /home/user/project/src/pages/Home.tsx lines 5-10]
Done! I've successfully updated the Header import in Home.tsx.
```

**With SAM** (~15 tokens):
```
[sl_file ...Header.tsx] -> $0
[sl_read $0]
[Grep "Header" ./src/ *.tsx] -> #3
[Edit $1:5-10]
~
```

> **11x reduction** on a single interaction. Compound this over an entire session.

---

## Real-World Results

Measured across actual Claude Code sessions — not benchmarks, real work:

| Session Type | Compression | Savings | Measured On |
|-------------|:-----------:|:-------:|-------------|
| Short (1-2 tasks) | **3-5x** | 60-80% | Small bug fixes, quick edits |
| Medium (5-10 tasks) | **5-15x** | 80-93% | Feature development, refactors |
| Long (20+ tasks) | **10-30x** | 90-97% | Large refactors, multi-file changes |

---

## How It Works

SAM operates across two layers that work together:

### Layer 1: Behavioral Protocol

Rules injected into `CLAUDE.md` that reshape how Claude communicates:

| Rule | What it does | Savings |
|------|-------------|:-------:|
| **Zero Filler** | No "Let me...", "Voy a...", "Done!" — just act | 60-80% |
| **Status Codes** | `+` created, `~` modified, `!` error, `#3` = 3 found | 70-90% |
| **Alias Everything** | `$0` instead of `/home/user/project/src/file.tsx` | 80-95% |
| **Reference, Don't Repeat** | Point to `$1:15-20` instead of pasting content | 100% |
| **Subagent Protocol** | All subagents inherit the same rules via `sl_spec` | 40-60% |

### Layer 2: MCP Server (21 Tools)

| Tool | What it does |
|------|-------------|
| **`sl_read`** | Read files with auto-compression + caching |
| **`sl_bash`** | Execute commands with compressed output |
| **`sl_file`** | Register a file path → get `$0`, `$1`... alias |
| **`sl_alias`** | Register custom alias for URLs, long strings, patterns |
| **`sl_compress`** | Compress arbitrary text programmatically |
| **`sl_decompress`** | Expand compressed text back to full form |
| **`sl_spec`** | Load full protocol spec + restore memory (subagents call this first) |
| **`sl_stats`** | Show token savings metrics for current session |
| **`sl_savings`** | Lifetime token savings + USD per Claude model |
| **`sl_dict`** | Show all active aliases in the dictionary |
| **`sl_save`** | Persist dictionary to disk across sessions |
| **`sl_reset`** | Clear session data (preserves persisted dictionary) |
| **`sl_diff`** | Compressed git diff |
| **`sl_tree`** | Project tree with auto-registration |
| **`sl_batch`** | Read multiple files in one call |
| **`sl_init`** | Deep project scan (tree + key files + presets) |
| **`sl_macro`** | Run built-in or custom multi-step macros |
| **`sl_workspace`** | In-memory file cache with staleness detection |
| **`sl_context`** | Journal entries for architecture, decisions, bugs |
| **`sl_snapshot`** | Save full session state for later restore |
| **`sl_restore`** | Restore session state after context compaction |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  CLAUDE.md Protocol Rules                        │  Behavioral layer
│  Zero filler, status codes, alias-everything     │  (teaches Claude to be concise)
├──────────────────────────────────────────────────┤
│  MCP Server — 21 tools via stdio                 │  Runtime layer
│  sl_read, sl_bash, sl_context, sl_snapshot...    │  (provides compression + memory)
├──────────────────────────────────────────────────┤
│  Encoder + Dictionary + Metrics                  │  Serialization engine
│  7-step compress pipeline, bidirectional aliases  │  (the actual compression)
├──────────────────────────────────────────────────┤
│  Context Manager + Workspace                     │  External memory
│  Journal, snapshots, in-memory file cache        │  (survives context compaction)
├──────────────────────────────────────────────────┤
│  Persistence Layer                               │  Cross-session memory
│  ~/.sam/ (dictionary, journal, snapshots, metrics)│  (aliases survive restarts)
└──────────────────────────────────────────────────┘
```

### Encoder Pipeline (7 steps)

1. Replace tool names with single chars (`Read` → `r`, `Edit` → `e`)
2. Compress bash commands (`git status` → `gs`, `npm run test` → `nt`)
3. Compress code snippets (`console.log` → `.log`, `function` → `.fn`)
4. Replace `$HOME` → `~`, `$CWD` → `.`
5. Detect and alias URLs → `&xxx` (deterministic 3-char hash)
6. Detect and alias long paths → `$N`
7. Strip filler phrases via regex patterns

All steps are **bidirectional** — `sl_decompress` reverses the process exactly.

---

## Framework Presets

SAM auto-detects your project and loads relevant aliases:

```bash
sam presets
```

| Preset | Detects | Adds |
|--------|---------|------|
| **React** | `package.json` with react/next | Component paths, JSX snippets |
| **Node** | `package.json`, `tsconfig.json` | Module paths, TS snippets |
| **Python** | `requirements.txt`, `pyproject.toml` | Python idiom snippets |

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `sam install` | Register MCP server globally + create CLAUDE.md protocol in current dir |
| `sam uninstall` | Remove SAM from global settings + clean legacy entries |
| `sam status` | Show SAM registration status and dictionary info |
| `sam doctor` | Diagnose configuration issues |
| `sam presets` | Show available framework presets |
| `sam dict` | Show persisted dictionary (aliases across sessions) |
| `sam help` | Show help |

---

## Transparency

What SAM **does**:
- Compresses Claude's internal operations (tool calls, status updates, file references)
- Provides compressed wrappers for Read and Bash via `sl_read` / `sl_bash`
- Persists aliases, journal entries, and snapshots across sessions
- Tracks and reports token savings (session + lifetime)

What SAM **does NOT do**:
- Does not affect user-facing responses — you still get normal answers
- Cannot compress Claude Code's system prompt — that's fixed overhead
- Cannot guarantee exact savings — Claude sometimes ignores protocol rules
- Does not intercept or modify your data — it only adds compression tools

---

## Contributing

SAM is **open source** under the **MIT license**. We welcome contributions from the community.

### How to Contribute

1. **Fork** the repo
2. **Branch** from `community-pr`
3. Make your changes
4. **Open a PR** back to `community-pr` with a clear description
5. Discuss and iterate

Proposals that get approved will be merged into `dev`, tested, and eventually promoted to `main`.

**Ideas welcome:** new presets, compression strategies, tool improvements, documentation, bug fixes — everything counts.

---

## License

**MIT** — free and open source forever.

Use it, fork it, sell it, modify it — do whatever you want. Just include the license.

See [LICENSE](LICENSE) for the full text.
