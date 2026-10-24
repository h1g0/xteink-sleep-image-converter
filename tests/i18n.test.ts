import { describe, expect, it } from 'vitest';
import { preferredLang } from '../src/i18n';

describe('preferredLang', () => {
  it('日本語が一番優先なら日本語', () => {
    expect(preferredLang(['ja', 'en-US'])).toBe('ja');
    expect(preferredLang(['ja-JP'])).toBe('ja');
  });

  it('英語が日本語より優先なら英語', () => {
    expect(preferredLang(['en-US', 'ja'])).toBe('en');
    expect(preferredLang(['en-GB', 'ja-JP'])).toBe('en');
  });

  it('対応していない言語は飛ばして、先に出てくる対応言語を使う', () => {
    expect(preferredLang(['zh-CN', 'ja', 'en'])).toBe('ja');
    expect(preferredLang(['fr-FR', 'en', 'ja'])).toBe('en');
  });

  it('どちらもなければ英語', () => {
    expect(preferredLang(['de-DE', 'fr'])).toBe('en');
    expect(preferredLang([])).toBe('en');
  });

  it('大文字小文字を区別しない', () => {
    expect(preferredLang(['JA-jp'])).toBe('ja');
  });
});
