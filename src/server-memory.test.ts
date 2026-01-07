import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerseCache, compressStream, createTerseServiceClient } from './server-memory';
import { compress, isTersePayload } from './core';

describe('TerseCache', () => {
  const testData = [
    { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  ];

  it('stores data in compressed form', () => {
    const cache = new TerseCache();
    cache.set('users', testData);

    expect(cache.size).toBe(1);
    expect(cache.has('users')).toBe(true);
  });

  it('returns Proxy-wrapped data on get()', () => {
    const cache = new TerseCache();
    cache.set('users', testData);

    const users = cache.get('users');
    expect(users).toBeDefined();
    expect(users![0].firstName).toBe('John');
    expect(users![1].lastName).toBe('Smith');
  });

  it('returns raw TersePayload on getRaw()', () => {
    const cache = new TerseCache();
    cache.set('users', testData);

    const raw = cache.getRaw('users');
    expect(raw).toBeDefined();
    expect(isTersePayload(raw)).toBe(true);
    expect(raw!.__terse__).toBe(true);
  });

  it('returns undefined for non-existent keys', () => {
    const cache = new TerseCache();
    expect(cache.get('nonexistent')).toBeUndefined();
    expect(cache.getRaw('nonexistent')).toBeUndefined();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('deletes entries', () => {
    const cache = new TerseCache();
    cache.set('users', testData);

    expect(cache.has('users')).toBe(true);
    cache.delete('users');
    expect(cache.has('users')).toBe(false);
  });

  it('clears all entries', () => {
    const cache = new TerseCache();
    cache.set('users', testData);
    cache.set('admins', testData);

    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('respects maxSize with LRU eviction', () => {
    const cache = new TerseCache({ maxSize: 2 });

    cache.set('a', [{ name: 'a' }]);
    cache.set('b', [{ name: 'b' }]);
    cache.set('c', [{ name: 'c' }]); // Should evict 'a'

    expect(cache.size).toBe(2);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  it('updates LRU order on access', () => {
    const cache = new TerseCache({ maxSize: 2 });

    cache.set('a', [{ name: 'a' }]);
    cache.set('b', [{ name: 'b' }]);

    // Access 'a' to make it most recently used
    cache.get('a');

    // Add 'c' - should evict 'b' (least recently used)
    cache.set('c', [{ name: 'c' }]);

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });

  it('respects TTL expiration', async () => {
    const cache = new TerseCache({ defaultTTL: 50 });

    cache.set('users', testData);
    expect(cache.has('users')).toBe(true);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 60));

    expect(cache.has('users')).toBe(false);
    expect(cache.get('users')).toBeUndefined();
  });

  it('allows per-entry TTL override', async () => {
    const cache = new TerseCache({ defaultTTL: 1000 });

    cache.set('short', [{ name: 'short' }], 50);
    cache.set('long', [{ name: 'long' }]); // Uses default TTL

    await new Promise(resolve => setTimeout(resolve, 60));

    expect(cache.has('short')).toBe(false);
    expect(cache.has('long')).toBe(true);
  });

  it('passes compress options to compress()', () => {
    const cache = new TerseCache({
      compressOptions: { minKeyLength: 10 },
    });

    // With minKeyLength: 10, shorter keys won't be compressed
    cache.set('users', testData);
    const raw = cache.getRaw('users');

    // firstName, lastName, email are all < 10 chars, so shouldn't be compressed
    const compressedKeys = Object.values(raw!.k);
    expect(compressedKeys).not.toContain('email');
  });
});

describe('compressStream', () => {
  async function* createAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      yield item;
    }
  }

  it('compresses items in batches', async () => {
    const items = Array.from({ length: 250 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const batches: unknown[] = [];
    for await (const batch of compressStream(createAsyncIterable(items), { batchSize: 100 })) {
      batches.push(batch);
    }

    expect(batches.length).toBe(3); // 100 + 100 + 50
    expect(isTersePayload(batches[0])).toBe(true);
  });

  it('handles items less than batch size', async () => {
    const items = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' },
    ];

    const batches: unknown[] = [];
    for await (const batch of compressStream(createAsyncIterable(items), { batchSize: 100 })) {
      batches.push(batch);
    }

    expect(batches.length).toBe(1);
    expect(isTersePayload(batches[0])).toBe(true);
  });

  it('handles empty source', async () => {
    const batches: unknown[] = [];
    for await (const batch of compressStream(createAsyncIterable([]), { batchSize: 100 })) {
      batches.push(batch);
    }

    expect(batches.length).toBe(0);
  });

  it('uses default batch size of 100', async () => {
    const items = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const batches: unknown[] = [];
    for await (const batch of compressStream(createAsyncIterable(items))) {
      batches.push(batch);
    }

    expect(batches.length).toBe(2); // 100 + 50
  });
});

describe('createTerseServiceClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('creates a client with the correct base URL', () => {
    const client = createTerseServiceClient({
      baseUrl: 'http://test-service:3000',
      fetch: mockFetch,
    });

    expect(client).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.forward).toBeDefined();
  });

  describe('get()', () => {
    it('makes GET request with Accept-Terse header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      await client.get('/api/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-service:3000/api/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept-Terse': 'true',
          }),
        })
      );
    });

    it('returns Proxy-wrapped data when response is TersePayload', async () => {
      const tersePayload = compress([
        { firstName: 'John', lastName: 'Doe' },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => tersePayload,
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      const result = await client.get<Array<{ firstName: string }>>('/api/users');
      expect(result[0].firstName).toBe('John');
    });

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      await expect(client.get('/api/users')).rejects.toThrow('failed with status 404');
    });
  });

  describe('post()', () => {
    it('compresses array data by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      await client.post('/api/users', [{ firstName: 'John' }]);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(isTersePayload(body)).toBe(true);
      expect(call[1].headers['X-Terse-JSON']).toBe('true');
    });

    it('does not compress non-array data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      await client.post('/api/users', { firstName: 'John' });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(isTersePayload(body)).toBe(false);
      expect(body.firstName).toBe('John');
    });
  });

  describe('forward()', () => {
    it('forwards TersePayload without modification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const client = createTerseServiceClient({
        baseUrl: 'http://test-service:3000',
        fetch: mockFetch,
      });

      const payload = compress([{ firstName: 'John' }]);
      await client.forward('/api/sync', payload);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body).toEqual(payload);
      expect(call[1].headers['X-Terse-JSON']).toBe('true');
    });
  });

  it('includes custom headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const client = createTerseServiceClient({
      baseUrl: 'http://test-service:3000',
      fetch: mockFetch,
      headers: { 'X-Custom': 'value' },
    });

    await client.get('/api/users');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'value',
        }),
      })
    );
  });

  it('respects expandOnReceive: false', async () => {
    const tersePayload = compress([{ firstName: 'John' }]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tersePayload,
    });

    const client = createTerseServiceClient({
      baseUrl: 'http://test-service:3000',
      fetch: mockFetch,
      expandOnReceive: false,
    });

    const result = await client.get('/api/users');

    // Should return raw payload, not Proxy-wrapped
    expect(isTersePayload(result)).toBe(true);
  });
});
