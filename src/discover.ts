import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

export const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');

export interface Project {
  name: string;
  rawName: string;
  dir: string;
  sessionCount: number;
  lastModified: Date;
}

export interface SessionPreview {
  id: string;
  path: string;
  timestamp: string | null;
  lastModified: number;
  preview: string;
  gitBranch: string | null;
  slug: string | null;
  model: string | null;
  hasSubagents: boolean;
  totalTokens: number;
  outputTokens: number;
}

export interface CwdMatch {
  projectRawName: string;
  sessionId: string;
}

export function decodeDirName(dirName: string): string {
  // Directory names encode paths: /Users/foo/bar → -Users-foo-bar
  // This is lossy (dots become dashes too), but good enough for display
  if (dirName.startsWith('-')) {
    return '/' + dirName.slice(1).replace(/-/g, '/');
  }
  return dirName;
}

export function listProjects(): Project[] {
  if (!fs.existsSync(CLAUDE_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(CLAUDE_DIR, { withFileTypes: true });
  const projects: Project[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(CLAUDE_DIR, entry.name);
    const jsonlFiles = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) continue;

    let lastModified = 0;
    for (const f of jsonlFiles) {
      const stat = fs.statSync(path.join(projectDir, f));
      if (stat.mtimeMs > lastModified) lastModified = stat.mtimeMs;
    }

    projects.push({
      name: decodeDirName(entry.name),
      rawName: entry.name,
      dir: projectDir,
      sessionCount: jsonlFiles.length,
      lastModified: new Date(lastModified),
    });
  }

  projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  return projects;
}

async function getSessionPreview(filePath: string): Promise<SessionPreview> {
  return new Promise((resolve) => {
    const result: SessionPreview = {
      id: path.basename(filePath, '.jsonl'),
      path: filePath,
      timestamp: null,
      lastModified: fs.statSync(filePath).mtimeMs,
      preview: '',
      gitBranch: null,
      slug: null,
      model: null,
      hasSubagents: false,
      totalTokens: 0,
      outputTokens: 0,
    };

    const sessionDir = path.join(path.dirname(filePath), result.id);
    if (fs.existsSync(path.join(sessionDir, 'subagents'))) {
      result.hasSubagents = true;
    }

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    let foundPreview = false;

    rl.on('line', (line) => {
      try {
        const obj = JSON.parse(line);

        if (!result.timestamp && obj.timestamp) {
          result.timestamp = obj.timestamp;
        }
        if (!result.gitBranch && obj.gitBranch) {
          result.gitBranch = obj.gitBranch;
        }
        if (!result.slug && obj.slug) {
          result.slug = obj.slug;
        }

        if (!result.model && obj.type === 'assistant' && obj.message?.model) {
          result.model = obj.message.model;
        }

        if (obj.type === 'assistant' && obj.message?.usage) {
          const u = obj.message.usage;
          result.totalTokens += (u.input_tokens || 0) + (u.output_tokens || 0)
            + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
          result.outputTokens += u.output_tokens || 0;
        }

        if (!foundPreview && obj.type === 'user' && obj.message) {
          const content = obj.message.content;
          let text = '';
          if (typeof content === 'string') {
            text = content;
          } else if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                text = block.text;
                break;
              }
            }
          }
          if (text) {
            result.preview = text.replace(/\n/g, ' ').slice(0, 100);
            foundPreview = true;
          }
        }
      } catch {
        // skip malformed lines
      }
    });

    rl.on('close', () => resolve(result));
    rl.on('error', () => resolve(result));
  });
}

export async function listSessions(projectDir: string): Promise<SessionPreview[]> {
  const jsonlFiles = fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(projectDir, f));

  const sessions = await Promise.all(jsonlFiles.map(getSessionPreview));
  sessions.sort((a, b) => b.lastModified - a.lastModified);
  return sessions;
}

function readCwdFromSession(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    let found: string | null = null;
    rl.on('line', (line) => {
      if (found) return;
      try {
        const obj = JSON.parse(line);
        if (obj.cwd) {
          found = obj.cwd;
          rl.close();
        }
      } catch {
        // skip
      }
    });

    rl.on('close', () => resolve(found));
    rl.on('error', () => resolve(found));
  });
}

function latestSessionFile(projectDir: string): { file: string; mtimeMs: number } | null {
  const files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));
  if (!files.length) return null;
  let best: string | null = null;
  let bestMtime = 0;
  for (const f of files) {
    const mtime = fs.statSync(path.join(projectDir, f)).mtimeMs;
    if (mtime > bestMtime) {
      bestMtime = mtime;
      best = f;
    }
  }
  return best ? { file: best, mtimeMs: bestMtime } : null;
}

export async function findSessionForCwd(cwd: string): Promise<CwdMatch | null> {
  // Pick the project whose cwd is the most specific (longest) match for the
  // given cwd. A brand-new session in a specific subdir should win over an
  // older, more-active ancestor project.
  const projects = listProjects();
  let bestMatch: CwdMatch | null = null;
  let bestLen = -1;

  for (const project of projects) {
    const latest = latestSessionFile(project.dir);
    if (!latest) continue;
    const projectCwd = await readCwdFromSession(path.join(project.dir, latest.file));
    if (!projectCwd) continue;

    const isMatch = cwd === projectCwd || cwd.startsWith(projectCwd + path.sep);
    if (isMatch && projectCwd.length > bestLen) {
      bestMatch = {
        projectRawName: project.rawName,
        sessionId: path.basename(latest.file, '.jsonl'),
      };
      bestLen = projectCwd.length;
    }
  }

  return bestMatch;
}
