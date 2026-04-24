#!/usr/bin/env node
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { listProjects, listSessions, findSessionForCwd } from '../discover';
import { parseSession } from '../parser';
import { generate } from '../html-generator';
import { generateIndex, generateSessionList } from '../pages';
// Published at dist/bin/ccakashic.js, so ../../package.json resolves from dist/
import * as pkg from '../../package.json';

function openInBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

const PORT = parseInt(process.env.CCAKASHIC_PORT || '') || 3333;
const MAX_PORT_TRIES = 20;
const LOCK_FILE = path.join(os.tmpdir(), `ccakashic-${os.userInfo().username || 'user'}.json`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost`);
    const pathname = url.pathname;

    if (pathname === '/__ccakashic') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'ccakashic', version: pkg.version }));
      return;
    }

    if (pathname === '/' || pathname === '') {
      const projects = listProjects();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateIndex(projects));
      return;
    }

    const projectMatch = pathname.match(/^\/project\/(.+)$/);
    if (projectMatch && !pathname.includes('/session/')) {
      const rawName = decodeURIComponent(projectMatch[1]);
      const projects = listProjects();
      const project = projects.find((p) => p.rawName === rawName);
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
      const rawName = decodeURIComponent(sessionMatch[1]);
      const sessionId = decodeURIComponent(sessionMatch[2]);
      const projects = listProjects();
      const project = projects.find((p) => p.rawName === rawName);
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
      const session = sessions.find((s) => s.id === sessionId) || { id: sessionId, path: sessionPath };
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

async function buildOpenUrl(baseUrl: string): Promise<string> {
  try {
    const match = await findSessionForCwd(process.cwd());
    if (match) {
      console.log(`Detected session for ${process.cwd()} → opening at bottom`);
      return `${baseUrl}/project/${encodeURIComponent(match.projectRawName)}/session/${encodeURIComponent(match.sessionId)}#session-bottom`;
    }
  } catch (err: any) {
    console.error('Failed to auto-detect session:', err?.message);
  }
  return baseUrl;
}

function probeCcakashic(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/__ccakashic',
      method: 'GET',
      timeout: 500,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && parsed.name === 'ccakashic');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function readLockPort(): number | null {
  try {
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
    return typeof data.port === 'number' ? data.port : null;
  } catch {
    return null;
  }
}

function writeLockFile(port: number): void {
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ port, pid: process.pid, startedAt: Date.now() }));
  } catch {
    // best-effort
  }
}

function cleanupLockFile(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}

function listenOnPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => { server.off('listening', onListening); reject(err); };
    const onListening = () => { server.off('error', onError); resolve(); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

async function findExistingCcakashic(startPort: number): Promise<number | null> {
  const lockPort = readLockPort();
  if (lockPort && await probeCcakashic(lockPort)) return lockPort;
  if (startPort !== lockPort && await probeCcakashic(startPort)) return startPort;
  return null;
}

async function startServer(startPort: number): Promise<number> {
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = startPort + i;
    try {
      await listenOnPort(port);
      return port;
    } catch (err: any) {
      if (err?.code !== 'EADDRINUSE') throw err;
      if (await probeCcakashic(port)) return -port;
    }
  }
  throw new Error(`No available port after ${MAX_PORT_TRIES} tries starting at ${startPort}`);
}

async function main() {
  const existing = await findExistingCcakashic(PORT);
  if (existing) {
    const url = `http://127.0.0.1:${existing}`;
    console.log(`Reusing existing ccakashic at ${url}`);
    writeLockFile(existing);
    openInBrowser(await buildOpenUrl(url));
    return;
  }

  const result = await startServer(PORT);
  if (result < 0) {
    const port = -result;
    const url = `http://127.0.0.1:${port}`;
    console.log(`Reusing existing ccakashic at ${url}`);
    writeLockFile(port);
    openInBrowser(await buildOpenUrl(url));
    return;
  }

  const port = result;
  const url = `http://127.0.0.1:${port}`;
  console.log(`ccakashic running at ${url}`);
  console.log('Press Ctrl+C to stop');
  writeLockFile(port);

  const cleanup = () => { cleanupLockFile(); process.exit(0); };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanupLockFile);

  openInBrowser(await buildOpenUrl(url));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
