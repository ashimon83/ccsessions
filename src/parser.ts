import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Raw JSONL entries are heterogeneous; use a permissive type for them.
type RawLine = any;
export type Message = any;

export interface UsageStats {
  turns: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreation: number;
  cacheRead: number;
  totalTokens: number;
  cacheHitRate: number;
  durationMs: number;
}

export interface ParsedSession {
  messages: Message[];
  subagents: Record<string, Message[]>;
  sessionPath: string;
  stats: UsageStats;
}

export async function parseSession(sessionPath: string): Promise<ParsedSession> {
  const lines = await readJsonlLines(sessionPath);
  const messages = buildConversation(lines);

  const sessionId = path.basename(sessionPath, '.jsonl');
  const subagentsDir = path.join(path.dirname(sessionPath), sessionId, 'subagents');
  const subagents: Record<string, Message[]> = {};

  if (fs.existsSync(subagentsDir)) {
    const agentFiles = fs.readdirSync(subagentsDir).filter((f) => f.endsWith('.jsonl'));
    for (const f of agentFiles) {
      const agentLines = await readJsonlLines(path.join(subagentsDir, f));
      const agentMessages = buildConversation(agentLines);
      const agentId = f.replace(/^agent-/, '').replace(/\.jsonl$/, '');
      subagents[agentId] = agentMessages;
    }
  }

  inlineSubagents(messages, subagents);

  const stats = aggregateUsage(lines);

  return { messages, subagents: {}, sessionPath, stats };
}

function aggregateUsage(lines: RawLine[]): UsageStats {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreation = 0;
  let cacheRead = 0;
  let turns = 0;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  for (const line of lines) {
    if (line.timestamp) {
      if (!firstTimestamp) firstTimestamp = line.timestamp;
      lastTimestamp = line.timestamp;
    }

    if (line.type === 'assistant') {
      const usage = line.message?.usage;
      if (usage) {
        turns++;
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
        cacheCreation += usage.cache_creation_input_tokens || 0;
        cacheRead += usage.cache_read_input_tokens || 0;
      }
    }
  }

  const totalInput = inputTokens + cacheCreation + cacheRead;
  const totalTokens = totalInput + outputTokens;
  const cacheTotal = cacheCreation + cacheRead;
  const cacheHitRate = cacheTotal > 0 ? cacheRead / cacheTotal : 0;

  let durationMs = 0;
  if (firstTimestamp && lastTimestamp) {
    durationMs = new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime();
  }

  return {
    turns,
    inputTokens,
    outputTokens,
    cacheCreation,
    cacheRead,
    totalTokens,
    cacheHitRate,
    durationMs,
  };
}

function readJsonlLines(filePath: string): Promise<RawLine[]> {
  return new Promise((resolve) => {
    const lines: RawLine[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      try {
        lines.push(JSON.parse(line));
      } catch {
        // skip
      }
    });

    rl.on('close', () => resolve(lines));
    rl.on('error', () => resolve(lines));
  });
}

function buildConversation(lines: RawLine[]): Message[] {
  const messages: Message[] = [];

  const assistantById = new Map<string, RawLine>();
  for (const line of lines) {
    if (line.type === 'assistant' && line.message?.id) {
      assistantById.set(line.message.id, line);
    }
  }
  const seenAssistantIds = new Set<string>();

  for (const line of lines) {
    if (['file-history-snapshot', 'last-prompt', 'permission-mode'].includes(line.type)) {
      continue;
    }

    if (line.type === 'user') {
      processUserMessage(line, messages);
    } else if (line.type === 'assistant') {
      const msgId = line.message?.id;
      if (msgId) {
        if (seenAssistantIds.has(msgId)) continue;
        if (assistantById.get(msgId) !== line) continue;
        seenAssistantIds.add(msgId);
      }
      processAssistantMessage(line, messages);
    } else if (line.type === 'system') {
      processSystemMessage(line, messages);
    }
  }

  pairToolMessages(messages);
  calculateTurnUsage(messages);
  calculateElapsed(messages);

  return messages;
}

function parseLocalCommand(text: string) {
  const inputMatch = text.match(/<bash-input>([\s\S]*?)<\/bash-input>/);
  const stdoutMatch = text.match(/<bash-stdout>([\s\S]*?)<\/bash-stdout>/);
  const stderrMatch = text.match(/<bash-stderr>([\s\S]*?)<\/bash-stderr>/);

  if (inputMatch) {
    return { type: 'local_command', subtype: 'input', command: inputMatch[1] };
  }
  if (stdoutMatch || stderrMatch) {
    return {
      type: 'local_command',
      subtype: 'output',
      stdout: stdoutMatch ? stdoutMatch[1] : '',
      stderr: stderrMatch ? stderrMatch[1] : '',
    };
  }
  return null;
}

function processUserText(text: string, line: RawLine, messages: Message[]): void {
  if (text.match(/^<local-command-caveat>/)) {
    return;
  }

  const localCmd = parseLocalCommand(text);
  if (localCmd) {
    if (localCmd.subtype === 'input') {
      messages.push({
        type: 'local_command',
        command: localCmd.command,
        timestamp: line.timestamp,
        uuid: line.uuid,
      });
    } else if (localCmd.subtype === 'output') {
      const prev = messages.length > 0 ? messages[messages.length - 1] : null;
      if (prev && prev.type === 'local_command' && !prev.stdout) {
        prev.stdout = localCmd.stdout;
        prev.stderr = localCmd.stderr;
      } else {
        messages.push({
          type: 'local_command',
          command: '',
          stdout: localCmd.stdout,
          stderr: localCmd.stderr,
          timestamp: line.timestamp,
          uuid: line.uuid,
        });
      }
    }
    return;
  }

  const stripped = text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .trim();

  if (stripped) {
    messages.push({
      type: 'user',
      text: stripped,
      timestamp: line.timestamp,
      uuid: line.uuid,
    });
  }
}

function processUserMessage(line: RawLine, messages: Message[]): void {
  const content = line.message?.content;
  if (!content) return;

  if (typeof content === 'string') {
    if (content.trim()) {
      processUserText(content, line, messages);
    }
    return;
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'text' && block.text?.trim()) {
        processUserText(block.text, line, messages);
      } else if (block.type === 'tool_result') {
        const toolResult: Message = {
          type: 'tool_result',
          toolUseId: block.tool_use_id,
          timestamp: line.timestamp,
          uuid: line.uuid,
        };

        if (line.toolUseResult) {
          toolResult.richResult = line.toolUseResult;
        }

        if (typeof block.content === 'string') {
          toolResult.content = block.content;
        } else if (Array.isArray(block.content)) {
          const texts = block.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text);
          toolResult.content = texts.join('\n');
        }

        if (toolResult.content && toolResult.content.includes('<persisted-output>')) {
          const match = toolResult.content.match(/Full output saved to: ([^\n<]+)/);
          if (match) {
            const persistedPath = match[1].trim();
            try {
              if (fs.existsSync(persistedPath)) {
                toolResult.fullContent = fs.readFileSync(persistedPath, 'utf-8');
              }
            } catch {
              // ignore
            }
          }
        }

        messages.push(toolResult);
      }
    }
  }
}

function processAssistantMessage(line: RawLine, messages: Message[]): void {
  const content = line.message?.content;
  if (!content || !Array.isArray(content)) return;

  const usage = line.message?.usage || null;
  let usageAssigned = false;

  for (const block of content) {
    if (block.type === 'thinking') {
      messages.push({
        type: 'thinking',
        timestamp: line.timestamp,
        uuid: line.uuid,
      });
    } else if (block.type === 'text' && block.text?.trim()) {
      messages.push({
        type: 'assistant',
        text: block.text,
        model: line.message.model,
        timestamp: line.timestamp,
        uuid: line.uuid,
        usage: !usageAssigned ? usage : null,
      });
      usageAssigned = true;
    } else if (block.type === 'tool_use') {
      messages.push({
        type: 'tool_use',
        toolName: block.name,
        toolUseId: block.id,
        input: block.input,
        timestamp: line.timestamp,
        uuid: line.uuid,
        usage: !usageAssigned ? usage : null,
      });
      usageAssigned = true;
    }
  }
}

function calculateTurnUsage(messages: Message[]): void {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].type !== 'user' && messages[i].type !== 'local_command') continue;

    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCacheCreate = 0;
    const seenUsageIds = new Set<string>();

    for (let j = i + 1; j < messages.length; j++) {
      const m = messages[j];
      if (m.type === 'user' || m.type === 'local_command') break;
      if (m.usage && !seenUsageIds.has(m.uuid + (m.usage.input_tokens || 0))) {
        seenUsageIds.add(m.uuid + (m.usage.input_tokens || 0));
        totalInput += m.usage.input_tokens || 0;
        totalOutput += m.usage.output_tokens || 0;
        totalCacheRead += m.usage.cache_read_input_tokens || 0;
        totalCacheCreate += m.usage.cache_creation_input_tokens || 0;
      }
    }

    let turnDurationMs = 0;
    for (let j = i + 1; j < messages.length; j++) {
      const m = messages[j];
      if (m.type === 'user' || m.type === 'local_command') break;
      if (m.type === 'system' && m.subtype === 'turn_duration') {
        turnDurationMs = m.durationMs || 0;
        break;
      }
    }

    const total = totalInput + totalOutput + totalCacheRead + totalCacheCreate;
    if (total > 0 || turnDurationMs > 0) {
      messages[i].turnUsage = {
        input: totalInput,
        output: totalOutput,
        cacheRead: totalCacheRead,
        cacheCreate: totalCacheCreate,
        total,
        durationMs: turnDurationMs,
      };
    }
  }
}

function calculateElapsed(messages: Message[]): void {
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.timestamp && curr.timestamp) {
      const elapsed = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (elapsed > 0) {
        curr.elapsedMs = elapsed;
      }
    }
    if (curr.type === 'tool_use' && curr.result?.timestamp && curr.timestamp) {
      const execTime = new Date(curr.result.timestamp).getTime() - new Date(curr.timestamp).getTime();
      if (execTime > 0) {
        curr.execMs = execTime;
      }
    }
  }
}

function processSystemMessage(line: RawLine, messages: Message[]): void {
  if (line.subtype === 'turn_duration') {
    messages.push({
      type: 'system',
      subtype: 'turn_duration',
      durationMs: line.durationMs,
      timestamp: line.timestamp,
    });
  } else if (line.subtype === 'bridge_status') {
    // skip
  } else if (line.content) {
    messages.push({
      type: 'system',
      subtype: line.subtype || 'info',
      content: typeof line.content === 'string' ? line.content : JSON.stringify(line.content),
      timestamp: line.timestamp,
    });
  }
}

function inlineSubagents(messages: Message[], subagents: Record<string, Message[]>): void {
  if (!Object.keys(subagents).length) return;

  for (const msg of messages) {
    if (msg.type !== 'tool_use' || msg.toolName !== 'Agent') continue;
    if (!msg.result) continue;

    const content = msg.result.content || msg.result.fullContent || '';
    const match = content.match(/agentId:\s*([a-f0-9]+)/);
    if (match) {
      const agentId = match[1];
      if (subagents[agentId]) {
        msg.subagentMessages = subagents[agentId];
        msg.subagentId = agentId;
      }
    }
  }

  const usedIds = new Set(
    messages.filter((m) => m.subagentId).map((m) => m.subagentId),
  );
  const unmatchedAgents = Object.keys(subagents).filter((id) => !usedIds.has(id));

  if (unmatchedAgents.length) {
    for (const msg of messages) {
      if (msg.type !== 'tool_use' || msg.toolName !== 'Agent') continue;
      if (msg.subagentMessages) continue;

      const desc = (msg.input?.description || '').toLowerCase();
      if (!desc) continue;

      for (let i = unmatchedAgents.length - 1; i >= 0; i--) {
        const agentId = unmatchedAgents[i];
        const firstMsg = subagents[agentId]?.[0];
        if (firstMsg?.type === 'user') {
          const agentText = (firstMsg.text || '').toLowerCase();
          if (agentText.includes(desc) || desc.includes(agentText.slice(0, 30))) {
            msg.subagentMessages = subagents[agentId];
            msg.subagentId = agentId;
            unmatchedAgents.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}

function pairToolMessages(messages: Message[]): void {
  const toolUseMap = new Map<string, number>();
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].type === 'tool_use') {
      toolUseMap.set(messages[i].toolUseId, i);
    }
  }

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].type === 'tool_result' && messages[i].toolUseId) {
      const useIdx = toolUseMap.get(messages[i].toolUseId);
      if (useIdx !== undefined) {
        messages[useIdx].result = messages[i];
        messages[i]._paired = true;
      }
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]._paired) {
      messages.splice(i, 1);
    }
  }
}
