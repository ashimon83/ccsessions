#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { listProjects, listSessions, findSessionForCwd } = require('../lib/discover');
const { parseSession } = require('../lib/parser');
const { generate } = require('../lib/html-generator');
const { generateIndex, generateSessionList } = require('../lib/pages');

function openInBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

const PORT = parseInt(process.env.CCAKASHIC_PORT) || 3333;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost`);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
      // Project index
      const projects = listProjects();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateIndex(projects));
      return;
    }

    const projectMatch = pathname.match(/^\/project\/(.+)$/);
    if (projectMatch && !pathname.includes('/session/')) {
      // Session list for a project
      const rawName = decodeURIComponent(projectMatch[1]);
      const projects = listProjects();
      const project = projects.find(p => p.rawName === rawName);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Project not found');
        return;
      }
      const sessions = await listSessions(project.dir);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateSessionList(project, sessions));
      return;
    }

    const sessionMatch = pathname.match(/^\/project\/(.+)\/session\/(.+)$/);
    if (sessionMatch) {
      // Render a specific session
      const rawName = decodeURIComponent(sessionMatch[1]);
      const sessionId = decodeURIComponent(sessionMatch[2]);
      const projects = listProjects();
      const project = projects.find(p => p.rawName === rawName);
      if (!project) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Project not found');
        return;
      }
      const sessionPath = path.join(project.dir, `${sessionId}.jsonl`);
      if (!fs.existsSync(sessionPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Session not found');
        return;
      }
      const sessions = await listSessions(project.dir);
      const session = sessions.find(s => s.id === sessionId) || { id: sessionId, path: sessionPath };
      const parsed = await parseSession(sessionPath);
      const html = generate(parsed, { projectName: project.name, session, backUrl: `/project/${encodeURIComponent(rawName)}` });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal server error');
  }
});

async function buildOpenUrl(baseUrl) {
  try {
    const match = await findSessionForCwd(process.cwd());
    if (match) {
      console.log(`Detected session for ${process.cwd()} → opening at bottom`);
      return `${baseUrl}/project/${encodeURIComponent(match.projectRawName)}/session/${encodeURIComponent(match.sessionId)}#session-bottom`;
    }
  } catch (err) {
    console.error('Failed to auto-detect session:', err.message);
  }
  return baseUrl;
}

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    const url = `http://127.0.0.1:${PORT}`;
    console.log(`Port ${PORT} is already in use — reusing existing server at ${url}`);
    const openUrl = await buildOpenUrl(url);
    openInBrowser(openUrl);
    return;
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', async () => {
  const addr = server.address();
  const url = `http://127.0.0.1:${addr.port}`;
  console.log(`ccakashic running at ${url}`);
  console.log('Press Ctrl+C to stop');
  const openUrl = await buildOpenUrl(url);
  openInBrowser(openUrl);
});
