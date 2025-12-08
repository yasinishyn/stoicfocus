import { describe, it, expect } from 'vitest';
import { getRandomQuote } from '../services/staticQuotes';

describe('staticQuotes', () => {
  it('returns a quote with text and author', () => {
    const q = getRandomQuote();
    expect(q).toHaveProperty('text');
    expect(q).toHaveProperty('author');
    expect(typeof q.text).toBe('string');
    expect(typeof q.author).toBe('string');
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.author.length).toBeGreaterThan(0);
  });

  it('quotes are reasonably short for friction typing', () => {
    const samples = Array.from({ length: 5 }, () => getRandomQuote().text.length);
    samples.forEach(len => {
      expect(len).toBeLessThanOrEqual(280); // ensure not excessively long
    });
  });
});

