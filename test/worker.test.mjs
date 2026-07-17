import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES,
  formatAddress,
  generateAddress,
  handleRequest,
  reverseGeocode
} from '../worker.js';

const SG_ADDRESS = {
  address: {
    country_code: 'sg',
    house_number: '10',
    road: 'Example Road',
    postcode: '123456',
    city: 'Singapore',
    country: 'Singapore'
  }
};

const NL_ADDRESS = {
  address: {
    country_code: 'nl',
    house_number: '10',
    road: 'Voorbeeldstraat',
    postcode: '1012 AB',
    city: 'Amsterdam',
    country: 'Nederland'
  }
};

function jsonFetch(value, { status = 200, counter } = {}) {
  return async () => {
    if (counter) counter.count++;
    return new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function addressAndPersonFetch(addressData, personData = {
  results: [{ gender: 'female', name: { first: 'Test', last: 'Person' } }]
}) {
  return async url => new Response(JSON.stringify(
    String(url).startsWith('https://randomuser.me/') ? personData : addressData
  ), { headers: { 'Content-Type': 'application/json' } });
}

class MemoryCache {
  constructor() { this.items = new Map(); }
  async match(request) {
    const value = this.items.get(request.url);
    return value ? value.clone() : undefined;
  }
  async put(request, response) {
    this.items.set(request.url, response.clone());
  }
}

test('Singapore configuration is complete and uses bounded land-area centers', () => {
  const sg = COUNTRIES.SG;
  assert.ok(sg);
  assert.equal(sg.dialingCode, '+65');
  assert.equal(sg.localDigits, 8);
  assert.equal(sg.centers.length, 6);
  assert.ok(sg.centers.every(([lat, lon, radius]) =>
    lat >= 1.2 && lat <= 1.5 && lon >= 103.6 && lon <= 104 && radius <= 0.006));
  assert.ok(sg.names.length >= 6);
});

test('Singapore address formatting follows the documented postal shape', () => {
  assert.equal(
    formatAddress(SG_ADDRESS.address, 'SG'),
    '10 Example Road, Singapore 123456, Singapore'
  );
});

test('Netherlands configuration and postal formatting are complete', () => {
  const nl = COUNTRIES.NL;
  assert.ok(nl);
  assert.equal(nl.dialingCode, '+31');
  assert.equal(nl.localDigits, 9);
  assert.equal(nl.centers.length, 5);
  assert.ok(nl.names.length >= 6);
  assert.equal(
    formatAddress({ ...NL_ADDRESS.address, postcode: '1012ab' }, 'NL'),
    '10 Voorbeeldstraat, 1012 AB Amsterdam, Netherlands'
  );
});

test('invalid country is rejected with a structured 400 response', async () => {
  const response = await handleRequest(new Request('https://example.test/api/generate?country=ZZ'));
  assert.equal(response.status, 400);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  const body = await response.json();
  assert.equal(body.error.code, 'invalid_country');
});

test('only GET and HEAD are accepted', async () => {
  const response = await handleRequest(new Request('https://example.test/api/countries', { method: 'POST' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal((await response.json()).error.code, 'method_not_allowed');

  const head = await handleRequest(new Request('https://example.test/', { method: 'HEAD' }));
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('dynamic upstream data is JSON only and never interpolated into executable HTML', async () => {
  const payload = `O'Neil <img src=x onerror=alert(1)>`;
  const upstream = {
    address: { ...SG_ADDRESS.address, road: payload }
  };
  const deps = { fetch: addressAndPersonFetch(upstream, {
    results: [{ gender: 'female', name: { first: `A'B`, last: '<script>alert(1)</script>' } }]
  }), random: () => 0.5, cache: null };
  const api = await handleRequest(
    new Request('https://example.test/api/generate?country=SG'), {}, deps
  );
  assert.equal(api.status, 200);
  assert.match(api.headers.get('content-type'), /^application\/json/);
  assert.equal(api.headers.get('x-content-type-options'), 'nosniff');
  assert.match((await api.json()).data.address, /<img/);

  const page = await handleRequest(new Request('https://example.test/'));
  const html = await page.text();
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.doesNotMatch(html, /onclick\s*=/i);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(page.headers.get('content-security-policy'), /frame-src https:\/\/www\.google\.com/);
  assert.match(html, /https:\/\/pic\.imgdb\.cn\/item\/66e7ab36d9c307b7e9cefd24\.png/);
  assert.match(html, /<iframe id="map"/);

  const script = await (await handleRequest(new Request('https://example.test/app.js'))).text();
  assert.match(script, /\.textContent\s*=/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
});

test('a valid Singapore result has +65 test phone and six-digit postcode', async () => {
  const result = await generateAddress('sg', {}, {
    fetch: addressAndPersonFetch(SG_ADDRESS),
    random: () => 0.5,
    cache: null
  });
  assert.ok(result.data);
  assert.equal(result.data.country, 'SG');
  assert.match(result.data.phone, /^\+65 [89]\d{3} \d{4}$/);
  assert.equal(result.data.address, '10 Example Road, Singapore 123456, Singapore');
  assert.equal(result.data.attempts, 1);
  assert.equal(result.data.name, 'Test Person');
  assert.match(result.data.identityNotice, /Random User name/);
});

test('a valid Netherlands result has +31 mobile test format and Dutch postcode', async () => {
  const result = await generateAddress('nl', {}, {
    fetch: addressAndPersonFetch(NL_ADDRESS),
    random: () => 0.5,
    cache: null
  });
  assert.ok(result.data);
  assert.equal(result.data.country, 'NL');
  assert.match(result.data.phone, /^\+31 6 \d{4} \d{4}$/);
  assert.equal(result.data.address, '10 Voorbeeldstraat, 1012 AB Amsterdam, Netherlands');
  assert.equal(result.data.attempts, 1);
});

test('Random User failure is normalized after a valid address without retrying Nominatim', async () => {
  let addressCalls = 0;
  let personCalls = 0;
  const fetch = async url => {
    if (String(url).startsWith('https://randomuser.me/')) {
      personCalls++;
      return new Response('blocked', { status: 503 });
    }
    addressCalls++;
    return new Response(JSON.stringify(SG_ADDRESS), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
  const result = await generateAddress('SG', {}, { fetch, random: () => 0.5, cache: null });
  assert.equal(addressCalls, 1);
  assert.equal(personCalls, 1);
  assert.equal((await result.error.json()).error.code, 'random_user_failure');
});

test('unsuitable upstream results stop after exactly fifty attempts', async () => {
  const counter = { count: 0 };
  const result = await generateAddress('SG', {}, {
    fetch: jsonFetch({ address: { country_code: 'sg' } }, { counter }),
    random: () => 0.5,
    cache: null
  });
  assert.equal(counter.count, 50);
  assert.ok(result.error);
  assert.equal(result.error.status, 502);
  assert.equal((await result.error.json()).error.code, 'no_matching_address');
});

test('upstream HTTP failure is normalized and bounded', async () => {
  const counter = { count: 0 };
  const result = await generateAddress('SG', {}, {
    fetch: jsonFetch({ message: 'blocked' }, { status: 403, counter }),
    random: () => 0.5,
    cache: null
  });
  assert.equal(counter.count, 50);
  assert.equal((await result.error.json()).error.code, 'upstream_failure');
});

test('upstream timeout is aborted and returned as a normalized error', async () => {
  let calls = 0;
  const fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    calls++;
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
  const result = await generateAddress('SG', {}, {
    fetch,
    random: () => 0.5,
    cache: null,
    timeoutMs: 2
  });
  assert.equal(calls, 50);
  assert.equal((await result.error.json()).error.code, 'upstream_timeout');
});

test('valid reverse-geocode data is cached by snapped coordinate', async () => {
  const counter = { count: 0 };
  const cache = new MemoryCache();
  const deps = { fetch: jsonFetch(SG_ADDRESS, { counter }), cache };
  const location = { lat: 1.30091, lon: 103.83949 };

  const first = await reverseGeocode('SG', location, {}, deps);
  const second = await reverseGeocode('SG', location, {}, deps);

  assert.equal(counter.count, 1);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(second.data, SG_ADDRESS);
});

test('cache misses and errors are not cached', async () => {
  const counter = { count: 0 };
  const cache = new MemoryCache();
  const deps = {
    fetch: jsonFetch({ address: { country_code: 'sg', road: 'No house number' } }, { counter }),
    cache
  };
  const location = { lat: 1.30091, lon: 103.83949 };
  await reverseGeocode('SG', location, {}, deps);
  await reverseGeocode('SG', location, {}, deps);
  assert.equal(counter.count, 2);
});
