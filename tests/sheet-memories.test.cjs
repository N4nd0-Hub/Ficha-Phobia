const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const photoHelpers = html.slice(html.indexOf('function phobiaPhotoSlots('), html.indexOf('function savePhobiaFallback('));

test('large memory photos survive compact fallback restoration without reviving deleted photos', () => {
  const photo = 'data:image/webp;base64,' + 'A'.repeat(36_000);
  const state = { charSheet: { memories: [{ id: 'live', title: 'Primeiro show', imageData: photo }, { id: 'cleared', imageData: '' }] } };
  const old = { charSheet: { memories: [{ id: 'cleared', imageData: photo }, { id: 'live', imageData: photo }, { id: 'removed', imageData: photo }] } };
  const ctx = vm.createContext({ state });
  vm.runInContext(photoHelpers, ctx);
  ctx.refreshPhobiaPhotoPresence();
  assert.equal(ctx.phobiaHasHeavyPhotos(), true);
  const compact = JSON.parse(ctx.serializePhobiaFallback(state));
  assert.equal(compact.charSheet.memories[0].imageData, '');
  assert.equal(ctx.recoverPhobiaPhotos(compact, old), 1);
  assert.deepEqual(compact.charSheet.memories, state.charSheet.memories);
});
