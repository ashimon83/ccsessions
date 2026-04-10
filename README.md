# ccsessions

A CLI tool to browse Claude Code session logs (`~/.claude/projects/`) as beautiful HTML in your browser.

## Usage

### npx

```bash
npx ccsessions
```

### Run from source

```bash
git clone git@github.com:ashimon83/ccsessions.git
cd ccsessions
npm start
```

A local HTTP server starts and your browser opens automatically.

## Features

- **Fully browser-based** — Project list → Session list → Conversation detail
- **Chat-style layout** — User / assistant messages in bubbles
- **Collapsible tool calls** — Bash, Read, Edit, and other tool invocations are collapsed into `<details>` blocks
- **Diff view** — File edits shown with red/green line highlights
- **Date navigation** — Side nav and sticky headers to jump between dates
- **Token stats** — Per-session input/output tokens, cache hit rate, and duration
- **Inline subagent conversations** — Subagent dialogues nested inside the Agent tool_use that spawned them
- **Permalinks** — Click any message timestamp to get a shareable URL
- **Dark mode** — Follows `prefers-color-scheme` automatically
- **Filter search** — Incremental filtering on list pages
- **Keyboard navigation** — `j` / `k` to move between messages
- **Zero dependencies** — Node.js built-in modules only

## Options

```bash
# Custom port (default: 3333)
CCSESSIONS_PORT=3000 npx ccsessions
```

## Requirements

- Node.js >= 18

## License

MIT
