import assert from 'node:assert';
import { test } from 'node:test';
import { t } from './translations.js';

test('t translation function', () => {
  // Test default language fallback (en)
  assert.strictEqual(t('app_title'), 'Circuit Attendant Scheduler');

  // Test existing translation in requested language ('en')
  assert.strictEqual(t('app_title', 'en'), 'Circuit Attendant Scheduler');

  // Test existing translation in another language ('es')
  assert.strictEqual(t('app_title', 'es'), 'Programador de Acomodadores');

  // Test fallback to English when the key exists in English but the requested language is unsupported
  assert.strictEqual(t('app_title', 'unsupported_lang'), 'Circuit Attendant Scheduler');

  // Test fallback to the key itself when the key is missing in all languages
  assert.strictEqual(t('non_existent_key', 'es'), 'non_existent_key');
  assert.strictEqual(t('non_existent_key', 'en'), 'non_existent_key');
  assert.strictEqual(t('non_existent_key'), 'non_existent_key');
});
