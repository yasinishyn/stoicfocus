export const normalizeDomainValue = (val: string): string => {
  let v = (val || '').trim();
  if (!v) return v;
  try {
    if (v.includes('://')) {
      const url = new URL(v);
      v = url.hostname;
    }
  } catch {
    // ignore parse errors
  }
  v = v.replace(/^https?:\/\//, '');
  v = v.replace(/^www\./, '');
  v = v.replace(/\/+$/, '');
  return v.toLowerCase();
};

