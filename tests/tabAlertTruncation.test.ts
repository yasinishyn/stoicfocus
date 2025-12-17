import { describe, it, expect } from 'vitest';

const truncateUrl = (url: string, max: number = 80) =>
  url.length > max ? `${url.slice(0, max - 3)}...` : url;

describe('Tab alert truncation', () => {
  it('truncates long URLs to max length with ellipsis', () => {
    const long = 'https://docs.google.com/spreadsheets/d/13dO8PHZCHTcZ1PmH0lIMFE9FiV3ZKLKUFHFSDais4Ms/edit?gid=2127975371#gid=2127975371';
    const truncated = truncateUrl(long);
    expect(truncated.length).toBeLessThanOrEqual(80);
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('leaves short URLs unchanged', () => {
    const short = 'https://github.com/RalabsCopilot';
    const truncated = truncateUrl(short);
    expect(truncated).toBe(short);
  });
});

