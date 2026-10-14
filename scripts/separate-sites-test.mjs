import assert from 'node:assert/strict';

let checks = 0;
async function check(url, status, redirectedPath) {
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(15000)});
  assert.equal(response.status, status, url);
  checks++;
  if (redirectedPath) {
    const destination = new URL(response.headers.get('location'), url);
    assert.equal(destination.origin, new URL(url).origin, 'Redirect keeps the separate site origin'); checks++;
    assert.equal(destination.pathname, redirectedPath); checks++;
  }
  return response;
}
await check('http://127.0.0.1:3850/', 307, '/nazarov');
await check('http://127.0.0.1:3852/', 307, '/admin/login');
await check('http://127.0.0.1:3853/', 307, '/operator');
for (const [port, entry, image] of [
  [3850, '/nazarov', 'client'], [3852, '/admin/login', 'admin'], [3853, '/operator', 'operator'],
]) {
  const origin = `http://127.0.0.1:${port}`;
  const response = await check(origin + entry, 200);
  const html = await response.text();
  assert.ok(html.includes('DMED')); checks++;
  for (const endpoint of ['/api/admin/chat-statistics', '/api/operator/chat-workspace']) {
    await check(origin + endpoint, 401);
  }
  const assetPath = image === 'client' ? '/art/dmed-client-color-v4.webp' : `/art/dmed-${image}-color-v5.webp`;
  if (image !== 'operator') { assert.ok(html.includes(assetPath), 'Page uses the current AI asset'); checks++; }
  const asset = await check(origin + assetPath, 200);
  assert.ok(asset.headers.get('content-type')?.includes('image/webp')); checks++;
  assert.ok((await asset.arrayBuffer()).byteLength > 1000); checks++;
  if (port === 3852) await check(origin + '/admin', 307, '/admin/login');
  else {
    const cross = await check(origin + '/admin', 307);
    assert.equal(new URL(cross.headers.get('location')).origin, 'http://127.0.0.1:3852'); checks++;
  }
}
console.log(`PASS: ${checks} checks for three separate origins, redirects, access and AI assets`);
