import { getCSS } from './template-assets';
import type { Project, SessionPreview } from './discover';

function escapeHtml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts: string | number | Date | null | undefined): string {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString('en-CA') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const GITHUB_URL = 'https://github.com/ashimon83/ccakashic';

function githubCorner(): string {
  return `<a href="${GITHUB_URL}" class="github-corner" aria-label="View source on GitHub" target="_blank" rel="noopener"><svg width="70" height="70" viewBox="0 0 250 250" aria-hidden="true"><path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style="transform-origin: 130px 106px;" class="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path></svg></a>`;
}

function pageShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${getCSS()}
${indexCSS()}
</style>
</head>
<body>
${githubCorner()}
${bodyHtml}
</body>
</html>`;
}

function indexCSS(): string {
  return `
.page-header {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 16px;
  border-bottom: 1px solid var(--border);
}
.page-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
}
.page-header .subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 4px;
}
.breadcrumb {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.breadcrumb a {
  color: var(--link);
  text-decoration: none;
}
.breadcrumb a:hover { text-decoration: underline; }

.list-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
.list-item {
  display: block;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
  text-decoration: none;
  color: var(--text);
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
}
.list-item:hover {
  background: var(--bg-secondary);
  border-color: var(--link);
}
.list-item-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}
.list-item-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.list-item-preview {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--tool-bg);
  border: 1px solid var(--border);
}
.search-box {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.9rem;
  margin-bottom: 16px;
  outline: none;
}
.search-box:focus {
  border-color: var(--link);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.search-box::placeholder { color: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

/* Session list layout */
.session-layout {
  display: flex;
  max-width: 1100px;
  margin: 0 auto;
  gap: 0;
}
.session-layout .list-container {
  flex: 1;
  min-width: 0;
}

/* Side nav */
.sidenav {
  width: 160px;
  flex-shrink: 0;
  position: sticky;
  top: 48px;
  align-self: flex-start;
  max-height: calc(100vh - 60px);
  overflow-y: auto;
  padding: 16px 8px 16px 16px;
  border-right: 1px solid var(--border);
}
.sidenav-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.sidenav-item {
  display: block;
  padding: 4px 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.15s, color 0.15s;
}
.sidenav-item:hover {
  background: var(--bg-secondary);
  color: var(--text);
}
.sidenav-item.active {
  background: var(--user-bg);
  color: var(--text);
  font-weight: 600;
}
.sidenav-count {
  font-weight: 400;
  opacity: 0.6;
}

/* Date group headings */
.date-heading {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  padding: 12px 0 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
  position: sticky;
  top: 44px;
  background: var(--bg);
  z-index: 5;
}

/* Sticky date bar */
.sticky-date-bar {
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
.sticky-date-bar.visible {
  transform: translateY(0);
}

/* Responsive: collapse sidenav on small screens */
@media (max-width: 768px) {
  .sidenav { display: none; }
  .session-layout { display: block; }
}
`;
}

export function generateIndex(projects: Project[]): string {
  const items = projects.map((p) => {
    const href = `/project/${encodeURIComponent(p.rawName)}`;
    return `<a class="list-item" href="${href}">
  <div class="list-item-title">${escapeHtml(p.name)}</div>
  <div class="list-item-meta">
    <span>${p.sessionCount} sessions</span>
    <span>Last: ${formatDate(p.lastModified)}</span>
  </div>
</a>`;
  }).join('\n');

  return pageShell('ccakashic', `
<div class="page-header">
  <h1>ccakashic</h1>
  <div class="subtitle">Claude Code Session Logs</div>
</div>
<div class="list-container">
  <input class="search-box" type="text" placeholder="Filter projects..." autofocus>
  ${items || '<div class="empty">No projects found</div>'}
</div>
<script>
document.querySelector('.search-box').addEventListener('input', function(e) {
  var q = e.target.value.toLowerCase();
  document.querySelectorAll('.list-item').forEach(function(el) {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
</script>`);
}

function formatDateOnly(ts: string | number | Date | null | undefined): string {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTimeOnly(ts: string | number | Date | null | undefined): string {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function generateSessionList(project: Project, sessions: SessionPreview[]): string {
  const dateGroups: { date: string; sessions: SessionPreview[] }[] = [];
  let currentDate: string | null = null;
  for (const s of sessions) {
    const dateStr = formatDateOnly(new Date(s.lastModified));
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      dateGroups.push({ date: dateStr, sessions: [] });
    }
    dateGroups[dateGroups.length - 1].sessions.push(s);
  }

  // Build side nav
  const sideNavItems = dateGroups.map(g =>
    `<a class="sidenav-item" href="#date-${g.date}" data-date="${escapeHtml(g.date)}">${escapeHtml(g.date)} <span class="sidenav-count">(${g.sessions.length})</span></a>`
  ).join('\n');

  // Build session items grouped by date
  const groupsHtml = dateGroups.map(g => {
    const items = g.sessions.map(s => {
      const href = `/project/${encodeURIComponent(project.rawName)}/session/${encodeURIComponent(s.id)}`;
      const lastModTime = formatTimeOnly(new Date(s.lastModified));
      const startedTime = formatDate(s.timestamp);
      const slug = s.slug ? `<span class="badge">${escapeHtml(s.slug)}</span>` : '';
      const sub = s.hasSubagents ? '<span class="badge">subagents</span>' : '';
      const model = s.model ? `<span>${escapeHtml(s.model)}</span>` : '';
      const branch = s.gitBranch && s.gitBranch !== 'HEAD' ? `<span>branch: ${escapeHtml(s.gitBranch)}</span>` : '';
      const tokens = s.totalTokens ? `<span>${formatTokens(s.totalTokens)} tokens</span>` : '';
      const outTok = s.outputTokens ? `<span>out: ${formatTokens(s.outputTokens)}</span>` : '';
      const preview = s.preview ? `<div class="list-item-preview">${escapeHtml(s.preview)}</div>` : '';

      return `<a class="list-item" href="${href}">
  <div class="list-item-title">${lastModTime} ${slug} ${sub}</div>
  <div class="list-item-meta"><span>started: ${startedTime}</span>${model}${branch}${tokens}${outTok}</div>
  ${preview}
</a>`;
    }).join('\n');

    return `<div class="date-group" id="date-${g.date}" data-date="${escapeHtml(g.date)}">
  <div class="date-heading">${escapeHtml(g.date)}</div>
  ${items}
</div>`;
  }).join('\n');

  return pageShell(`${project.name} — ccakashic`, `
<div class="sticky-date-bar" id="stickyDateBar"></div>
<div class="page-header">
  <div class="breadcrumb"><a href="/">ccakashic</a> / ${escapeHtml(project.name)}</div>
  <h1>${escapeHtml(project.name)}</h1>
  <div class="subtitle">${sessions.length} sessions</div>
</div>
<div class="session-layout">
  <nav class="sidenav" id="sidenav">
    <div class="sidenav-title">Dates</div>
    ${sideNavItems}
  </nav>
  <div class="list-container">
    <input class="search-box" type="text" placeholder="Filter sessions..." autofocus>
    ${groupsHtml || '<div class="empty">No sessions found</div>'}
  </div>
</div>
<script>
(function() {
  // Filter
  document.querySelector('.search-box').addEventListener('input', function(e) {
    var q = e.target.value.toLowerCase();
    document.querySelectorAll('.list-item').forEach(function(el) {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
    // Show/hide date groups if all items hidden
    document.querySelectorAll('.date-group').forEach(function(g) {
      var visible = g.querySelectorAll('.list-item:not([style*="display: none"])').length;
      g.style.display = visible ? '' : 'none';
    });
  });

  // Sticky date bar + sidenav active state on scroll
  var groups = Array.from(document.querySelectorAll('.date-group'));
  var bar = document.getElementById('stickyDateBar');
  var navItems = Array.from(document.querySelectorAll('.sidenav-item'));

  function updateCurrentDate() {
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

  window.addEventListener('scroll', updateCurrentDate, { passive: true });
  updateCurrentDate();
})();
</script>`);
}

