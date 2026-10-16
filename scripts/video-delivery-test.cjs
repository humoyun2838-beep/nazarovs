const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const b = '11111111-1111-1111-1111-111111111111';
const f = '22222222-2222-2222-2222-222222222222';
const calls = [];
const signed = 'https://file.notion.so/f/f/test.mp4?token=test';
const source = fs.readFileSync('src/app/api/media/notion/route.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
}}).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(code, {
  exports: moduleObject.exports, module: moduleObject,
  require: name => name.startsWith('@/data/') ? {} : require(name),
  URL, Headers, AbortSignal, setTimeout,
  fetch: async (url, options) => {
    calls.push({ url, options });
    if (url.includes('getSignedFileUrls')) {
      const request = JSON.parse(options.body);
      assert.equal(request.urls[0].useS3Url, false);
      return Response.json({ signedUrls: [signed] });
    }
    assert.equal(url, signed);
    const range = options.headers?.Range;
    assert.ok(range, 'Validation and streaming preserve byte-range requests');
    return new Response(new Uint8Array(range === 'bytes=100-199' ? 100 : 1), {
      status: 206, headers: { 'Content-Type': 'video/mp4',
        'Content-Range': range === 'bytes=100-199' ? 'bytes 100-199/1000' : 'bytes 0-0/1000',
        'Content-Length': range === 'bytes=100-199' ? '100' : '1' },
    });
  },
});
const GET = moduleObject.exports.GET;
const base = `https://example.test/api/media/notion?b=${b}&f=${f}&n=test.mp4`;
(async () => {
  let response = await GET(new NextRequest(base + '&fmt=json'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).url, signed);
  const count = calls.length;
  response = await GET(new NextRequest(base + '&fmt=json'));
  assert.equal(response.status, 200);
  assert.equal(calls.length, count, 'Repeat playback reuses a validated CDN URL');
  response = await GET(new NextRequest(base + '&proxy=1', { headers: { Range: 'bytes=100-199' } }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 100-199/1000');
  assert.equal(response.headers.get('content-length'), '100');
  assert.equal((await response.arrayBuffer()).byteLength, 100);
  response = await GET(new NextRequest(base));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), signed);
  response = await GET(new NextRequest('https://example.test/api/media/notion?b=bad&f=bad'));
  assert.equal(response.status, 400);
  console.log('PASS: CDN signing, cached replay, byte-range streaming, redirect, invalid IDs');
})().catch(error => { console.error(error); process.exitCode = 1; });
