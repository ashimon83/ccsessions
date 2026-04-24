export function getCSS(): string {
  return `
:root {
  --bg: #fafaf9;
  --bg-secondary: #f5f5f4;
  --text: #292524;
  --text-muted: #78716c;
  --border: #e7e5e4;
  --user-bg: #e0f2fe;
  --user-border: #bae6fd;
  --assistant-bg: #f5f5f4;
  --assistant-border: #d6d3d1;
  --tool-bg: #fafaf9;
  --tool-border: #e7e5e4;
  --thinking-bg: #fefce8;
  --thinking-border: #fde68a;
  --system-text: #a8a29e;
  --code-bg: #f5f5f4;
  --code-text: #9f1239;
  --code-block-bg: #1c1917;
  --code-block-text: #e7e5e4;
  --diff-add-bg: #ecfdf5;
  --diff-add-text: #065f46;
  --diff-del-bg: #fef2f2;
  --diff-del-text: #991b1b;
  --diff-hunk-text: #78716c;
  --subagent-border: #a78bfa;
  --link: #2563eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1917;
    --bg-secondary: #292524;
    --text: #e7e5e4;
    --text-muted: #a8a29e;
    --border: #44403c;
    --user-bg: #164e63;
    --user-border: #0e7490;
    --assistant-bg: #292524;
    --assistant-border: #57534e;
    --tool-bg: #1c1917;
    --tool-border: #44403c;
    --thinking-bg: #422006;
    --thinking-border: #a16207;
    --system-text: #78716c;
    --code-bg: #352f2b;
    --code-text: #fda4af;
    --code-block-bg: #0c0a09;
    --code-block-text: #e7e5e4;
    --diff-add-bg: #052e16;
    --diff-add-text: #6ee7b7;
    --diff-del-bg: #2d0f0f;
    --diff-del-text: #fca5a5;
    --diff-hunk-text: #78716c;
    --subagent-border: #8b5cf6;
    --link: #7dd3fc;
  }
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

/* GitHub Corner (by Tim Holman, tholman.com/github-corners) */
.github-corner {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 200;
  color: var(--bg);
}
.github-corner svg {
  fill: var(--text);
  color: var(--bg);
}
.github-corner:hover .octo-arm {
  animation: octocat-wave 560ms ease-in-out;
}
@keyframes octocat-wave {
  0%, 100% { transform: rotate(0); }
  20%, 60% { transform: rotate(-25deg); }
  40%, 80% { transform: rotate(10deg); }
}
@media (max-width: 500px) {
  .github-corner:hover .octo-arm { animation: none; }
  .github-corner .octo-arm { animation: octocat-wave 560ms ease-in-out; }
}

.session-header {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 16px;
  border-bottom: 1px solid var(--border);
}

.session-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.chat-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.msg {
  padding: 12px 16px;
  border-radius: 16px;
  max-width: 80%;
  position: relative;
}

/* Local command (user ! commands) */
.msg-local-cmd {
  align-self: flex-end;
  margin-left: 20%;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.82rem;
}
.local-cmd-input {
  padding: 2px 0;
  font-weight: 600;
}
.local-cmd-prompt {
  color: var(--text-muted);
  margin-right: 4px;
}
.local-cmd-output {
  margin-top: 4px;
  padding: 6px 8px;
  background: var(--code-block-bg);
  color: var(--code-block-text);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.78rem;
  max-height: 200px;
  overflow-y: auto;
}
.local-cmd-output code {
  background: none;
  padding: 0;
  color: inherit;
}
.local-cmd-stderr {
  border-left: 3px solid #ef4444;
}

/* Token usage badges */
.turn-usage, .item-usage {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.turn-usage {
  font-weight: 600;
}
.item-usage {
  font-weight: 400;
  opacity: 0.8;
}
.tool-usage-row {
  padding: 4px 14px 6px;
}
.usage-detail {
  font-size: 0.6rem;
  opacity: 0.7;
}

.msg .timestamp {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-decoration: none;
}
.msg .timestamp:hover {
  color: var(--link);
  text-decoration: underline;
}

.msg-user {
  align-self: flex-end;
  margin-left: 20%;
  margin-top: 32px;
  background: var(--user-bg);
  border: 1px solid var(--user-border);
  border-radius: 16px 16px 4px 16px;
}

.msg-assistant {
  align-self: flex-start;
  margin-right: 20%;
  background: var(--assistant-bg);
  border: 1px solid var(--assistant-border);
  border-radius: 16px 16px 16px 4px;
}

.msg-thinking {
  align-self: flex-start;
  background: var(--thinking-bg);
  border: 1px solid var(--thinking-border);
  padding: 6px 12px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.msg-tool {
  align-self: flex-start;
  max-width: 95%;
  width: 100%;
  background: var(--tool-bg);
  border: 1px solid var(--tool-border);
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}

.msg-tool details { padding: 0; }

.msg-tool summary {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
  list-style: none;
  transition: background 0.15s;
}

.msg-tool summary::-webkit-details-marker { display: none; }

.msg-tool summary::before {
  content: '\\25B6';
  font-size: 0.6rem;
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.msg-tool details[open] > summary::before {
  transform: rotate(90deg);
}

.msg-tool summary:hover {
  background: var(--bg-secondary);
}

.msg-tool summary::after {
  content: 'click to expand';
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-left: auto;
  opacity: 0.5;
}

.msg-tool details[open] > summary::after {
  content: 'click to collapse';
}

.tool-summary { font-family: monospace; }
.tool-summary code {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.tool-details {
  border-top: 1px solid var(--border);
  padding: 12px 14px;
}

.tool-input { margin-bottom: 8px; }
.tool-input-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tool-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-family: monospace;
}

.tool-output { margin-top: 8px; }
.tool-output.stderr pre { border-left: 3px solid #ef4444; }

.tool-output pre, .tool-input pre {
  background: var(--code-block-bg);
  color: var(--code-block-text);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.tool-output pre code, .tool-input pre code {
  background: none;
  padding: 0;
}

/* Diff styles */
.diff {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.8rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.diff-hunk {
  background: var(--bg-secondary);
  color: var(--diff-hunk-text);
  padding: 4px 12px;
  font-style: italic;
}

.diff-add {
  background: var(--diff-add-bg);
  color: var(--diff-add-text);
  padding: 1px 12px;
  white-space: pre-wrap;
}

.diff-del {
  background: var(--diff-del-bg);
  color: var(--diff-del-text);
  padding: 1px 12px;
  white-space: pre-wrap;
}

.diff-ctx {
  padding: 1px 12px;
  white-space: pre-wrap;
  color: var(--text-muted);
}

/* System messages */
.msg-system {
  align-self: center;
  font-size: 0.75rem;
  color: var(--system-text);
  padding: 4px 12px;
  max-width: 100%;
}

.duration {
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

/* Subagent */
.msg-subagent {
  max-width: 95%;
  width: 100%;
  padding: 0;
  border: 1px solid var(--subagent-border);
  border-radius: 8px;
  overflow: hidden;
}

.msg-subagent summary {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}

.msg-subagent summary::-webkit-details-marker { display: none; }

.msg-subagent summary::before {
  content: '\\25B6';
  font-size: 0.6rem;
  color: var(--subagent-border);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.msg-subagent details[open] > summary::before {
  transform: rotate(90deg);
}

.msg-subagent summary::after {
  content: 'click to expand';
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-left: auto;
  opacity: 0.5;
}

.msg-subagent details[open] > summary::after {
  content: 'click to collapse';
}

.msg-subagent summary:hover {
  background: var(--border);
}

.subagent-content {
  border-top: 1px solid var(--border);
  border-left: 3px solid var(--subagent-border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subagent-content .msg { max-width: 100%; }

/* Inline subagent (inside tool details) */
.subagent-inline {
  margin-top: 12px;
  border: 1px solid var(--subagent-border);
  border-radius: 8px;
  overflow: hidden;
}
.subagent-inline > details > summary {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.8rem;
  background: var(--bg-secondary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}
.subagent-inline > details > summary::-webkit-details-marker { display: none; }
.subagent-inline > details > summary::before {
  content: '\\25B6';
  font-size: 0.55rem;
  color: var(--subagent-border);
  transition: transform 0.2s;
}
.subagent-inline > details[open] > summary::before {
  transform: rotate(90deg);
}
.subagent-inline > details > summary:hover { background: var(--border); }
.subagent-inline .subagent-content {
  border-top: 1px solid var(--border);
  border-left: 3px solid var(--subagent-border);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Markdown content */
.msg-content h1, .msg-content h2, .msg-content h3 {
  margin-top: 0.5em;
  margin-bottom: 0.25em;
}
.msg-content h1 { font-size: 1.2rem; }
.msg-content h2 { font-size: 1.1rem; }
.msg-content h3 { font-size: 1rem; }

.msg-content p { margin: 0.4em 0; }

.msg-content pre {
  background: var(--code-block-bg);
  color: var(--code-block-text);
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8rem;
  margin: 0.5em 0;
}

.msg-content code {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 500;
}

.msg-content pre code {
  background: none;
  color: inherit;
  padding: 0;
  font-weight: normal;
}

.msg-content ul, .msg-content ol {
  margin: 0.4em 0;
  padding-left: 1.5em;
}

.msg-content table {
  border-collapse: collapse;
  margin: 0.5em 0;
  font-size: 0.85rem;
}

.msg-content th, .msg-content td {
  border: 1px solid var(--border);
  padding: 4px 10px;
}

.msg-content th { background: var(--bg-secondary); }

.msg-content blockquote {
  border-left: 3px solid var(--border);
  padding-left: 12px;
  color: var(--text-muted);
  margin: 0.4em 0;
}

.msg-content a {
  color: var(--link);
  text-decoration: none;
}
.msg-content a:hover { text-decoration: underline; }

/* Keyboard nav highlight */
.msg.focused {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}
`;
}

export function getAppJS(): string {
  return `
(function() {
  // Simple markdown renderer (no external dependency)
  function renderMarkdown(text) {
    // Escape HTML first (already escaped by server, but for client-side re-render)
    // Actually the text is already HTML-escaped, so we need to unescape first
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    // Code blocks (fenced)
    text = text.replace(/\`\`\`(\\w*)?\\n([\\s\\S]*?)\`\`\`/g, function(m, lang, code) {
      return '<pre><code class="language-' + (lang || '') + '">' + esc(code.trim()) + '</code></pre>';
    });

    // Inline code
    text = text.replace(/\`([^\`]+)\`/g, '<code>' + '$1' + '</code>');

    // Bold
    text = text.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

    // Italic
    text = text.replace(/(?<![*])\\*(?![*])(.+?)(?<![*])\\*(?![*])/g, '<em>$1</em>');

    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Unordered lists
    text = text.replace(/^[\\-*] (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\\/li>\\n?)+/g, '<ul>$&</ul>');

    // Links
    text = text.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');

    // Paragraphs (simple: double newlines)
    text = text.replace(/\\n\\n/g, '</p><p>');
    text = '<p>' + text + '</p>';

    // Clean up empty paragraphs
    text = text.replace(/<p><\\/p>/g, '');
    text = text.replace(/<p>(<h[123]>)/g, '$1');
    text = text.replace(/(<\\/h[123]>)<\\/p>/g, '$1');
    text = text.replace(/<p>(<pre>)/g, '$1');
    text = text.replace(/(<\\/pre>)<\\/p>/g, '$1');
    text = text.replace(/<p>(<ul>)/g, '$1');
    text = text.replace(/(<\\/ul>)<\\/p>/g, '$1');

    return text;
  }

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Render markdown in all [data-markdown] elements
  document.querySelectorAll('[data-markdown]').forEach(function(el) {
    el.innerHTML = renderMarkdown(el.textContent);
  });

  // Scroll to bottom when hash is #session-bottom. We re-scroll here (after
  // markdown rendering) because the DOM height grows when markdown expands,
  // making the browser's initial anchor scroll land in the wrong place.
  if (window.location.hash === '#session-bottom') {
    window.scrollTo(0, document.body.scrollHeight);
  }

  // Load more: reload the page to pick up any newly appended messages, then
  // scroll back to the bottom.
  var loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function() {
      window.location.hash = 'session-bottom';
      window.location.reload();
    });
  }

  // Keyboard navigation: j/k to move between user messages
  var msgEls = Array.from(document.querySelectorAll('.msg-user, .msg-assistant'));
  var currentIdx = -1;

  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'j' || e.key === 'k') {
      if (e.key === 'j') currentIdx = Math.min(currentIdx + 1, msgEls.length - 1);
      if (e.key === 'k') currentIdx = Math.max(currentIdx - 1, 0);

      msgEls.forEach(function(el) { el.classList.remove('focused'); });
      if (msgEls[currentIdx]) {
        msgEls[currentIdx].classList.add('focused');
        msgEls[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
})();
`;
}

