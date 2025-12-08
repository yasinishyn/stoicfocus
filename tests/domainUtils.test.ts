import { describe, it, expect } from 'vitest';
import { normalizeDomainValue } from '../src/domainUtils';

describe('normalizeDomainValue', () => {
  it('strips protocol and www and trailing slash', () => {
    expect(normalizeDomainValue('https://www.example.com/')).toBe('example.com');
    expect(normalizeDomainValue('http://example.com//')).toBe('example.com');
  });

  it('extracts hostname from full URL', () => {
    expect(normalizeDomainValue('https://calendar.google.com/')).toBe('calendar.google.com');
    expect(normalizeDomainValue('http://mail.google.com/inbox')).toBe('mail.google.com');
  });

  it('lowercases the domain', () => {
    expect(normalizeDomainValue('HTTPS://WWW.EXAMPLE.COM')).toBe('example.com');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeDomainValue('')).toBe('');
    expect(normalizeDomainValue('   ')).toBe('');
  });
});

