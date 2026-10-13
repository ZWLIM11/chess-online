import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDatabase } from '../scripts/deploy-cloudflare.mjs';

test('redeploy reuses the exact database without creating one', () => {
  const calls = [];
  const id = resolveDatabase(args => {
    calls.push(args);
    return JSON.stringify([{ name: 'other-game', uuid: 'other' }, { name: 'chess-online', uuid: 'existing' }]);
  }, 'chess-online');
  assert.equal(id, 'existing');
  assert.equal(calls.length, 1);
});
test('first deployment creates the named database and resolves its ID', () => {
  let created = false;
  const id = resolveDatabase(args => {
    if (args[1] === 'create') { assert.equal(args[2], 'chess-online'); created = true; return ''; }
    return JSON.stringify(created ? [{ name: 'chess-online', uuid: 'new' }] : []);
  }, 'chess-online');
  assert.equal(id, 'new');
});
test('an authorization failure stops provisioning', () => {
  assert.throws(() => resolveDatabase(() => { throw new Error('unauthorized'); }, 'chess-online'), /unauthorized/);
});
