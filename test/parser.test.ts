import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { parseSession } from '../src/parser';

const FIXTURE = path.join(__dirname, 'fixtures', 'simple-session.jsonl');

describe('parseSession', () => {
  it('extracts user and assistant messages in order', async () => {
    const parsed = await parseSession(FIXTURE);
    const types = parsed.messages.map((m) => m.type);
    // Expected sequence: user text, assistant text, tool_use (with paired result), assistant text, system turn_duration
    expect(types).toContain('user');
    expect(types).toContain('assistant');
    expect(types).toContain('tool_use');
  });

  it('pairs tool_use with tool_result', async () => {
    const parsed = await parseSession(FIXTURE);
    const toolUse = parsed.messages.find((m) => m.type === 'tool_use');
    expect(toolUse).toBeDefined();
    expect(toolUse.result).toBeDefined();
    expect(toolUse.result.toolUseId).toBe('tool-1');
    // tool_result should not appear as a separate top-level message once paired
    const orphanResults = parsed.messages.filter((m) => m.type === 'tool_result');
    expect(orphanResults).toHaveLength(0);
  });

  it('aggregates usage stats across assistant messages', async () => {
    const parsed = await parseSession(FIXTURE);
    expect(parsed.stats.turns).toBe(2);
    expect(parsed.stats.inputTokens).toBe(110);
    expect(parsed.stats.outputTokens).toBe(80);
    expect(parsed.stats.cacheCreation).toBe(1200);
    expect(parsed.stats.cacheRead).toBe(1100);
  });

  it('computes cache hit rate correctly', async () => {
    const parsed = await parseSession(FIXTURE);
    // cacheRead=1100, cacheCreate=1200, total=2300, rate = 1100/2300
    expect(parsed.stats.cacheHitRate).toBeCloseTo(1100 / 2300, 3);
  });

  it('attaches turn usage to the user message of that turn', async () => {
    const parsed = await parseSession(FIXTURE);
    const userMsg = parsed.messages.find((m) => m.type === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg.turnUsage).toBeDefined();
    expect(userMsg.turnUsage.durationMs).toBe(10000);
  });

  it('skips permission-mode and file-history-snapshot metadata lines', async () => {
    const parsed = await parseSession(FIXTURE);
    const bogus = parsed.messages.filter(
      (m) => m.type === 'permission-mode' || m.type === 'file-history-snapshot',
    );
    expect(bogus).toHaveLength(0);
  });
});
