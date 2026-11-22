import { describe, expect, it } from 'vitest';
import { preferredLang } from '../src/i18n';

describe('preferredLang', () => {
  it('Japanese when Japanese has the highest priority', () => {
    expect(preferredLang(['ja', 'en-US'])).toBe('ja');
    expect(preferredLang(['ja-JP'])).toBe('ja');
  });

  it('English when English ranks above Japanese', () => {
    expect(preferredLang(['en-US', 'ja'])).toBe('en');
    expect(preferredLang(['en-GB', 'ja-JP'])).toBe('en');
  });

  it('skips unsupported languages and uses the first supported one', () => {
    expect(preferredLang(['zh-CN', 'ja', 'en'])).toBe('ja');
    expect(preferredLang(['fr-FR', 'en', 'ja'])).toBe('en');
  });

  it('English when neither is present', () => {
    expect(preferredLang(['de-DE', 'fr'])).toBe('en');
    expect(preferredLang([])).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(preferredLang(['JA-jp'])).toBe('ja');
  });
});
