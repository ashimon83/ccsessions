'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');

function decodeDirName(dirName) {
  // Directory names encode paths: /Users/foo/bar → -Users-foo-bar
  // This is lossy (dots become dashes too), but good enough for display
  if (dirName.startsWith('-')) {
    return '/' + dirName.slice(1).replace(/-/g, '/');
  }
  return dirName;
}

function listProjects() {
  if (!fs.existsSync(CLAUDE_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(CLAUDE_DIR, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = path.join(CLAUDE_DIR, entry.name);
    const jsonlFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) continue;

    // Get most recent modification time
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

  projects.sort((a, b) => b.lastModified - a.lastModified);
  return projects;
}

async function getSessionPreview(filePath) {
  return new Promise((resolve) => {
    const result = {
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

    // Check for subagents directory
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

        // Extract model from first assistant message
        if (!result.model && obj.type === 'assistant' && obj.message?.model) {
          result.model = obj.message.model;
        }

        // Aggregate token usage
        if (obj.type === 'assistant' && obj.message?.usage) {
          const u = obj.message.usage;
          result.totalTokens += (u.input_tokens || 0) + (u.output_tokens || 0)
            + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
          result.outputTokens += u.output_tokens || 0;
        }

        // Extract first user message as preview
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

async function listSessions(projectDir) {
  const jsonlFiles = fs.readdirSync(projectDir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => path.join(projectDir, f));

  const sessions = await Promise.all(jsonlFiles.map(getSessionPreview));

  // Sort by file modification time descending (most recently active first)
  sessions.sort((a, b) => b.lastModified - a.lastModified);

  return sessions;
}

function readCwdFromSession(filePath) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    let found = null;
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

function latestSessionFile(projectDir) {
  const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
  if (!files.length) return null;
  let best = null;
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

async function findSessionForCwd(cwd) {
  // Pick the project whose cwd is the most specific (longest) match for the
  // given cwd. A brand-new session in a specific subdir should win over an
  // older, more-active ancestor project.
  const projects = listProjects();
  let bestMatch = null;
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

module.exports = { listProjects, listSessions, decodeDirName, findSessionForCwd, CLAUDE_DIR };
