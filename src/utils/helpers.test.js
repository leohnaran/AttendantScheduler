import test from 'node:test';
import assert from 'node:assert';
import { getLastName } from './helpers.js';

test('getLastName', async (t) => {
  await t.test('returns empty string for null', () => {
    assert.strictEqual(getLastName(null), '');
  });

  await t.test('returns empty string for undefined', () => {
    assert.strictEqual(getLastName(undefined), '');
  });

  await t.test('returns empty string for empty string', () => {
    assert.strictEqual(getLastName(''), '');
  });

  await t.test('returns the last name lowercase for a normal full name', () => {
    assert.strictEqual(getLastName('John Doe'), 'doe');
  });

  await t.test('returns the word lowercase for a single word name', () => {
    assert.strictEqual(getLastName('John'), 'john');
  });

  await t.test('returns the last word lowercase for a name with multiple middle names', () => {
    assert.strictEqual(getLastName('John Jacob Jingleheimer Schmidt'), 'schmidt');
  });

  await t.test('handles trailing and leading spaces', () => {
    assert.strictEqual(getLastName('  John Doe  '), 'doe');
  });

  await t.test('handles multiple spaces between names', () => {
    // Current logic: `trim().split(' ')` -> `['John', '', 'Doe']`
    // Wait, the current logic is: `parts = fullName.trim().split(' ')`, so 'John  Doe' will split to `['John', '', 'Doe']`. Last element is 'Doe'.
    // If it's 'John  Doe ', trim makes it 'John  Doe', split by ' ' makes it `['John', '', 'Doe']`.
    // Let's test what the current code actually does.
    assert.strictEqual(getLastName('John  Doe'), 'doe');
  });
});
