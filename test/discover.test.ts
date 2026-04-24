import { describe, it, expect } from 'vitest';
import { decodeDirName } from '../src/discover';

describe('decodeDirName', () => {
  it('converts leading dash to slash and inner dashes to slashes', () => {
    expect(decodeDirName('-Users-foo-bar')).toBe('/Users/foo/bar');
  });

  it('returns non-dashed names unchanged', () => {
    expect(decodeDirName('project')).toBe('project');
  });

  it('handles empty string by returning as-is', () => {
    expect(decodeDirName('')).toBe('');
  });
});
