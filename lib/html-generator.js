'use strict';

const { getCSS, getAppJS } = require('./template-assets');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms) {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

function toolUseSummary(msg) {
  const name = msg.toolName;
  const input = msg.input || {};

  switch (name) {
    case 'Bash':
      return `Bash: <code>${escapeHtml((input.command || '').slice(0, 120))}</code>`;
    case 'Read':
      return `Read: <code>${escapeHtml(input.file_path || '')}</code>`;
    case 'Write':
      return `Write: <code>${escapeHtml(input.file_path || '')}</code>`;
    case 'Edit':
      return `Edit: <code>${escapeHtml(input.file_path || '')}</code>`;
    case 'Grep':
      return `Grep: <code>${escapeHtml(input.pattern || '')}</code>`;
    case 'Glob':
      return `Glob: <code>${escapeHtml(input.pattern || '')}</code>`;
    case 'Agent':
      return `Agent: ${escapeHtml(input.description || input.subagent_type || '')}`;
    default:
      return escapeHtml(name);
  }
}

function renderToolResult(msg) {
  if (!msg.result) return '';

  const result = msg.result;
  const rich = result.richResult;
  const parts = [];

  if (rich) {
    // Bash result
    if (rich.stdout !== undefined) {
      if (rich.stdout) {
        parts.push(`<div class="tool-output"><pre><code>${escapeHtml(rich.stdout)}</code></pre></div>`);
      }
      if (rich.stderr) {
        parts.push(`<div class="tool-output stderr"><pre><code>${escapeHtml(rich.stderr)}</code></pre></div>`);
      }
      return parts.join('');
    }

    // File read result
    if (rich.type === 'text' && rich.file) {
      const f = rich.file;
      parts.push(`<div class="tool-meta">${escapeHtml(f.filePath)} (lines ${f.startLine}-${f.startLine + f.numLines - 1} of ${f.totalLines})</div>`);
      if (f.content) {
        parts.push(`<div class="tool-output"><pre><code>${escapeHtml(f.content.slice(0, 3000))}</code></pre></div>`);
      }
      return parts.join('');
    }

    // File edit/create with structuredPatch
    if ((rich.type === 'update' || rich.type === 'create') && rich.filePath) {
      parts.push(`<div class="tool-meta">${escapeHtml(rich.filePath)}</div>`);
      if (rich.structuredPatch && rich.structuredPatch.length > 0) {
        parts.push(renderDiff(rich.structuredPatch));
      } else if (rich.content) {
        parts.push(`<div class="tool-output"><pre><code>${escapeHtml(rich.content.slice(0, 3000))}</code></pre></div>`);
      }
      return parts.join('');
    }
  }

  // Fallback: raw content
  const content = result.fullContent || result.content;
  if (content) {
    parts.push(`<div class="tool-output"><pre><code>${escapeHtml(content.slice(0, 5000))}</code></pre></div>`);
  }

  return parts.join('');
}

function renderDiff(patches) {
  const lines = [];
  lines.push('<div class="diff">');
  for (const patch of patches) {
    lines.push(`<div class="diff-hunk">@@ -${patch.oldStart},${patch.oldLines} +${patch.newStart},${patch.newLines} @@</div>`);
    for (const line of (patch.lines || [])) {
      const ch = line[0];
      const text = line.slice(1);
      if (ch === '+') {
        lines.push(`<div class="diff-add">+${escapeHtml(text)}</div>`);
      } else if (ch === '-') {
        lines.push(`<div class="diff-del">-${escapeHtml(text)}</div>`);
      } else {
        lines.push(`<div class="diff-ctx"> ${escapeHtml(text)}</div>`);
      }
    }
  }
  lines.push('</div>');
  return lines.join('\n');
}

function msgId(ts) {
  if (!ts) return `msg-${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
  const d = new Date(ts);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `t${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function renderMessage(msg) {
  const id = msgId(msg.timestamp);
  const time = `<a class="timestamp" href="#${id}">${formatTime(msg.timestamp)}</a>`;

  const turnBadge = msg.turnUsage
    ? (() => {
        const c = calcCost(msg.turnUsage.input, msg.turnUsage.output, msg.turnUsage.cacheRead, msg.turnUsage.cacheCreate);
        const dur = msg.turnUsage.durationMs ? ` | ${formatDuration(msg.turnUsage.durationMs)}` : '';
        return `<span class="turn-usage">&#9889; Turn: ${c.totalStr}${dur} <span class="usage-detail">(in:${c.inStr} out:${c.outStr} cache-r:${c.crStr} cache-w:${c.cwStr})</span></span>`;
      })()
    : '';

  function makeItemBadge(m) {
    const parts = [];
    const c = m.usage
      ? calcCost(m.usage.input_tokens || 0, m.usage.output_tokens || 0, m.usage.cache_read_input_tokens || 0, m.usage.cache_creation_input_tokens || 0)
      : null;
    if (c) {
      parts.push(`${c.totalStr}`);
    }
    if (m.execMs) {
      parts.push(`${formatDuration(m.execMs)}`);
    } else if (m.elapsedMs && m.elapsedMs >= 1000) {
      parts.push(`${formatDuration(m.elapsedMs)}`);
    }
    if (!parts.length) return '';
    const detail = c ? ` <span class="usage-detail">(in:${c.inStr} out:${c.outStr} cache-r:${c.crStr} cache-w:${c.cwStr})</span>` : '';
    return `<span class="item-usage">${parts.join(' | ')}${detail}</span>`;
  }

  const itemBadge = makeItemBadge(msg);

  switch (msg.type) {
    case 'user':
      return `<div class="msg msg-user" id="${id}">${time}<div class="msg-content" data-markdown>${escapeHtml(msg.text)}</div>${turnBadge}</div>`;

    case 'assistant':
      return `<div class="msg msg-assistant" id="${id}">${time}<div class="msg-content" data-markdown>${escapeHtml(msg.text)}</div>${itemBadge ? `<div>${itemBadge}</div>` : ''}</div>`;

    case 'thinking':
      return `<div class="msg msg-thinking" id="${id}">${time}<span class="thinking-indicator">Thinking...</span></div>`;

    case 'tool_use': {
      const summary = toolUseSummary(msg);
      const resultHtml = renderToolResult(msg);
      const subagentHtml = msg.subagentMessages
        ? `<div class="subagent-inline"><details><summary><span class="tool-summary">Subagent conversation</span></summary><div class="subagent-content">${msg.subagentMessages.map(renderMessage).join('\n')}</div></details></div>`
        : '';
      return `<div class="msg msg-tool" id="${id}"><details><summary>${time}<span class="tool-summary">${summary}</span></summary><div class="tool-details">${renderToolInput(msg)}${resultHtml}${subagentHtml}</div></details>${itemBadge ? `<div class="tool-usage-row">${itemBadge}</div>` : ''}</div>`;
    }

    case 'tool_result':
      // Unpaired tool result (shouldn't happen often)
      return `<div class="msg msg-tool" id="${id}"><div class="tool-output"><pre><code>${escapeHtml((msg.content || '').slice(0, 2000))}</code></pre></div></div>`;

    case 'local_command': {
      const cmd = msg.command ? `<div class="local-cmd-input"><span class="local-cmd-prompt">$</span> ${escapeHtml(msg.command)}</div>` : '';
      const stdout = msg.stdout && msg.stdout.trim() ? `<pre class="local-cmd-output"><code>${escapeHtml(msg.stdout)}</code></pre>` : '';
      const stderr = msg.stderr && msg.stderr.trim() ? `<pre class="local-cmd-output local-cmd-stderr"><code>${escapeHtml(msg.stderr)}</code></pre>` : '';
      return `<div class="msg msg-local-cmd" id="${id}">${time}${cmd}${stdout}${stderr}${turnBadge}</div>`;
    }

    case 'system':
      if (msg.subtype === 'turn_duration') {
        return ''; // Now shown in turn usage badge
      }
      return `<div class="msg msg-system" id="${id}">${escapeHtml(msg.content || '')}</div>`;

    default:
      return '';
  }
}

function renderToolInput(msg) {
  const input = msg.input || {};
  const name = msg.toolName;

  // Show command for Bash
  if (name === 'Bash' && input.command) {
    return `<div class="tool-input"><div class="tool-input-label">Command:</div><pre><code>${escapeHtml(input.command)}</code></pre></div>`;
  }

  // Show old_string/new_string for Edit
  if (name === 'Edit' && input.old_string) {
    return `<div class="tool-input"><div class="tool-input-label">Edit:</div><div class="diff"><div class="diff-del">${escapeHtml(input.old_string)}</div><div class="diff-add">${escapeHtml(input.new_string || '')}</div></div></div>`;
  }

  // For other tools, show input as JSON if small enough
  const json = JSON.stringify(input, null, 2);
  if (json.length > 500) return '';
  return `<div class="tool-input"><pre><code>${escapeHtml(json)}</code></pre></div>`;
}

function renderSubagent(agentId, messages) {
  const agentHtml = messages.map(renderMessage).join('\n');
  return `<div class="msg msg-subagent"><details><summary><span class="tool-summary">Subagent: ${escapeHtml(agentId)}</span></summary><div class="subagent-content">${agentHtml}</div></details></div>`;
}

function formatDateOnly(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  for (const msg of messages) {
    const dateStr = formatDateOnly(msg.timestamp);
    if (dateStr && dateStr !== currentDate) {
      currentDate = dateStr;
      groups.push({ date: dateStr, messages: [] });
    }
    if (groups.length === 0) {
      groups.push({ date: 'unknown', messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

// Cost per 1M tokens (USD) - Claude Opus 4 pricing
const COST_PER_M = {
  input: 15,
  output: 75,
  cacheRead: 1.5,
  cacheWrite: 18.75,
};

function tokenCostUsd(tokens, rate) {
  return (tokens / 1_000_000) * rate;
}

function formatCost(usd) {
  if (usd < 0.001) return '<$0.01';
  if (usd < 0.01) return `$${usd.toFixed(3)}`;
  if (usd < 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(2)}`;
}

function calcCost(input, output, cacheRead, cacheWrite) {
  const inCost = tokenCostUsd(input, COST_PER_M.input);
  const outCost = tokenCostUsd(output, COST_PER_M.output);
  const crCost = tokenCostUsd(cacheRead, COST_PER_M.cacheRead);
  const cwCost = tokenCostUsd(cacheWrite, COST_PER_M.cacheWrite);
  const total = inCost + outCost + crCost + cwCost;
  return {
    totalStr: formatCost(total),
    inStr: formatTokens(input),
    outStr: formatTokens(output),
    crStr: formatTokens(cacheRead),
    cwStr: formatTokens(cacheWrite),
  };
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function formatDurationLong(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function renderStats(stats) {
  if (!stats || !stats.turns) return '';

  const totalCost = calcCost(stats.inputTokens, stats.outputTokens, stats.cacheRead, stats.cacheCreation);

  const items = [];
  items.push(`<span class="stat-item"><span class="stat-label">Est. Cost</span><span class="stat-value">${totalCost.totalStr}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Turns</span><span class="stat-value">${stats.turns}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Input</span><span class="stat-value">${formatTokens(stats.inputTokens)}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Output</span><span class="stat-value">${formatTokens(stats.outputTokens)}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Cache Read</span><span class="stat-value">${formatTokens(stats.cacheRead)}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Cache Write</span><span class="stat-value">${formatTokens(stats.cacheCreation)}</span></span>`);
  items.push(`<span class="stat-item"><span class="stat-label">Cache Hit</span><span class="stat-value">${(stats.cacheHitRate * 100).toFixed(0)}%</span></span>`);
  if (stats.durationMs) {
    items.push(`<span class="stat-item"><span class="stat-label">Duration</span><span class="stat-value">${formatDurationLong(stats.durationMs)}</span></span>`);
  }

  return `<div class="stats-bar">${items.join('')}</div>`;
}

function generate(parsed, options = {}) {
  const { projectName, session, backUrl } = options;
  const title = session?.slug || session?.id || 'Session';
  const date = session?.timestamp
    ? new Date(session.timestamp).toLocaleDateString('en-CA')
    : '';

  // Group messages by date
  const dateGroups = groupMessagesByDate(parsed.messages);

  // Build grouped HTML with date anchors
  const groupsHtml = dateGroups.map(g => {
    const msgsHtml = g.messages.map(renderMessage).join('\n');
    return `<div class="detail-date-group" id="date-${g.date}" data-date="${escapeHtml(g.date)}">
  <div class="detail-date-heading">${escapeHtml(g.date)}</div>
  ${msgsHtml}
</div>`;
  }).join('\n');

  // Side nav for dates
  const sideNavItems = dateGroups
    .filter(g => g.date !== 'unknown')
    .map(g =>
      `<a class="detail-sidenav-item" href="#date-${g.date}" data-date="${escapeHtml(g.date)}">${escapeHtml(g.date)}</a>`
    ).join('\n');

  const backLink = backUrl
    ? `<div style="font-size:0.8rem;margin-bottom:8px"><a href="${escapeHtml(backUrl)}" style="color:var(--link);text-decoration:none">&larr; Back to sessions</a> &nbsp;|&nbsp; <a href="/" style="color:var(--link);text-decoration:none">All projects</a></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — ${escapeHtml(date)}</title>
<style>${getCSS()}
${detailLayoutCSS()}
</style>
</head>
<body>
<a href="https://github.com/ashimon83/ccakashic" class="github-corner" aria-label="View source on GitHub" target="_blank" rel="noopener"><svg width="70" height="70" viewBox="0 0 250 250" aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path></svg></a>
<div class="detail-sticky-bar" id="detailStickyBar"></div>
<header class="session-header">
  ${backLink}
  <h1>${escapeHtml(title)}</h1>
  <div class="session-meta">
    ${projectName ? `<span class="meta-item">Project: ${escapeHtml(projectName)}</span>` : ''}
    ${date ? `<span class="meta-item">Date: ${escapeHtml(date)}</span>` : ''}
    ${session?.gitBranch ? `<span class="meta-item">Branch: ${escapeHtml(session.gitBranch)}</span>` : ''}
    ${session?.model ? `<span class="meta-item">Model: ${escapeHtml(session.model)}</span>` : ''}
  </div>
  ${renderStats(parsed.stats)}
</header>
<div class="detail-layout">
  <nav class="detail-sidenav" id="detailSidenav">
    <div class="detail-sidenav-title">Dates</div>
    ${sideNavItems}
    <div class="detail-sidenav-jump">
      <a class="detail-sidenav-item" href="#session-bottom">&#8595; Bottom</a>
      <a class="detail-sidenav-item" href="#session-top">&#8593; Top</a>
    </div>
  </nav>
  <main class="chat-container" id="session-top">
  ${groupsHtml}
  <div class="load-more-row">
    <button class="load-more-btn" id="loadMoreBtn" type="button">Load more &#x21bb;</button>
  </div>
  <div id="session-bottom"></div>
  </main>
</div>
<script>${getAppJS()}
${detailNavJS()}
</script>
</body>
</html>`;
}

function detailLayoutCSS() {
  return `
.detail-layout {
  display: flex;
  max-width: 1100px;
  margin: 0 auto;
  gap: 0;
}
.detail-layout .chat-container {
  flex: 1;
  min-width: 0;
}

/* Load more (reload) button at the bottom of the thread */
.load-more-row {
  display: flex;
  justify-content: center;
  margin: 24px 0 12px;
}
.load-more-btn {
  padding: 8px 18px;
  font-size: 0.85rem;
  color: var(--text);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}
.load-more-btn:hover {
  background: var(--bg-hover, var(--border));
}

/* Stats bar */
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}
.stat-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-value {
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Detail side nav */
.detail-sidenav {
  width: 140px;
  flex-shrink: 0;
  position: sticky;
  top: 48px;
  align-self: flex-start;
  max-height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 16px 8px 16px 16px;
  border-right: 1px solid var(--border);
}
.detail-sidenav-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.detail-sidenav-jump {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.detail-sidenav-item {
  display: block;
  padding: 4px 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.15s, color 0.15s;
}
.detail-sidenav-item:hover {
  background: var(--bg-secondary);
  color: var(--text);
}
.detail-sidenav-item.active {
  background: var(--user-bg);
  color: var(--text);
  font-weight: 600;
}

/* Date group headings in detail */
.detail-date-heading {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  padding: 14px 0 6px;
  border-bottom: 2px solid var(--border);
  margin-bottom: 12px;
  position: sticky;
  top: 44px;
  background: var(--bg);
  z-index: 5;
}
.detail-date-group {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Sticky date bar */
.detail-sticky-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 8px 24px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  transform: translateY(-100%);
  transition: transform 0.2s;
}
.detail-sticky-bar.visible {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .detail-sidenav { display: none; }
  .detail-layout { display: block; }
}
`;
}

function detailNavJS() {
  return `
(function() {
  var groups = Array.from(document.querySelectorAll('.detail-date-group'));
  var bar = document.getElementById('detailStickyBar');
  var navItems = Array.from(document.querySelectorAll('.detail-sidenav-item'));
  if (!groups.length) return;

  function update() {
    var scrollY = window.scrollY + 60;
    var current = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].offsetTop <= scrollY) current = groups[i];
    }
    var date = current ? current.dataset.date : '';
    if (date) {
      bar.textContent = date;
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
    navItems.forEach(function(a) {
      a.classList.toggle('active', a.dataset.date === date);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
`;
}

module.exports = { generate };
