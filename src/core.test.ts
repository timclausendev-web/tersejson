import { describe, it, expect } from 'vitest';
import {
  compress,
  expand,
  isCompressibleArray,
  isTersePayload,
  createTerseProxy,
  wrapWithProxy,
} from './core';

describe('isCompressibleArray', () => {
  it('returns true for array of objects', () => {
    const data = [{ a: 1 }, { b: 2 }];
    expect(isCompressibleArray(data)).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(isCompressibleArray([])).toBe(false);
  });

  it('returns false for array of primitives', () => {
    expect(isCompressibleArray([1, 2, 3])).toBe(false);
  });

  it('returns false for array with mixed types', () => {
    expect(isCompressibleArray([{ a: 1 }, 'string', 3])).toBe(false);
  });

  it('returns false for non-array', () => {
    expect(isCompressibleArray({ a: 1 })).toBe(false);
    expect(isCompressibleArray('string')).toBe(false);
    expect(isCompressibleArray(null)).toBe(false);
  });
});

describe('compress', () => {
  it('compresses array of objects with long keys', () => {
    const data = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ];

    const result = compress(data);

    expect(result.__terse__).toBe(true);
    expect(result.v).toBe(1);
    expect(Object.keys(result.k).length).toBe(2);
    expect(Object.values(result.k)).toContain('firstName');
    expect(Object.values(result.k)).toContain('lastName');
  });

  it('preserves short keys that would not benefit from compression', () => {
    const data = [
      { id: 1, firstName: 'John' },
      { id: 2, firstName: 'Jane' },
    ];

    const result = compress(data);

    // 'id' is only 2 chars, shouldn't be compressed (default minKeyLength is 3)
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).not.toContain('id');
    expect(compressedKeys).toContain('firstName');
  });

  it('handles nested objects', () => {
    const data = [
      { userName: 'john', profile: { displayName: 'John Doe' } },
      { userName: 'jane', profile: { displayName: 'Jane Smith' } },
    ];

    const result = compress(data);

    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).toContain('displayName');
    expect(compressedKeys).toContain('profile');
  });

  it('handles nested arrays', () => {
    const data = [
      {
        userName: 'john',
        orders: [
          { productName: 'Widget', quantity: 5 },
          { productName: 'Gadget', quantity: 3 },
        ],
      },
    ];

    const result = compress(data);

    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).toContain('productName');
    expect(compressedKeys).toContain('quantity');
  });

  it('respects minKeyLength option', () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const result = compress(data, { minKeyLength: 4 });

    // 'name' and 'age' are both 3-4 chars, with minKeyLength: 4, 'age' won't be compressed
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('name');
    expect(compressedKeys).not.toContain('age');
  });
});

describe('expand', () => {
  it('expands compressed payload back to original', () => {
    const original = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ];

    const compressed = compress(original);
    const expanded = expand(compressed);

    expect(expanded).toEqual(original);
  });

  it('handles nested objects', () => {
    const original = [
      { userName: 'john', profile: { displayName: 'John Doe' } },
    ];

    const compressed = compress(original);
    const expanded = expand(compressed);

    expect(expanded).toEqual(original);
  });

  it('handles nested arrays', () => {
    const original = [
      {
        userName: 'john',
        orders: [
          { productName: 'Widget', quantity: 5 },
        ],
      },
    ];

    const compressed = compress(original);
    const expanded = expand(compressed);

    expect(expanded).toEqual(original);
  });
});

describe('isTersePayload', () => {
  it('returns true for valid terse payload', () => {
    const payload = {
      __terse__: true,
      v: 1,
      k: { a: 'firstName' },
      d: [{ a: 'John' }],
    };
    expect(isTersePayload(payload)).toBe(true);
  });

  it('returns false for regular object', () => {
    expect(isTersePayload({ firstName: 'John' })).toBe(false);
  });

  it('returns false for array', () => {
    expect(isTersePayload([{ firstName: 'John' }])).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isTersePayload(null)).toBe(false);
    expect(isTersePayload(undefined)).toBe(false);
  });
});

describe('createTerseProxy', () => {
  it('allows access by original key names', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    expect(proxy.firstName).toBe('John');
    expect(proxy.lastName).toBe('Doe');
  });

  it('handles nested objects', () => {
    const compressed = {
      a: 'john',
      b: { c: 'John Doe' },
    };
    const keyMap = { a: 'userName', b: 'profile', c: 'displayName' };

    const proxy = createTerseProxy<{
      userName: string;
      profile: { displayName: string };
    }>(compressed, keyMap);

    expect(proxy.userName).toBe('john');
    expect(proxy.profile.displayName).toBe('John Doe');
  });

  it('handles nested arrays', () => {
    const compressed = {
      a: 'john',
      b: [{ c: 'Widget', d: 5 }],
    };
    const keyMap = { a: 'userName', b: 'orders', c: 'productName', d: 'quantity' };

    const proxy = createTerseProxy<{
      userName: string;
      orders: Array<{ productName: string; quantity: number }>;
    }>(compressed, keyMap);

    expect(proxy.userName).toBe('john');
    expect(proxy.orders[0].productName).toBe('Widget');
    expect(proxy.orders[0].quantity).toBe(5);
  });

  it('supports "in" operator', () => {
    const compressed = { a: 'John' };
    const keyMap = { a: 'firstName' };

    const proxy = createTerseProxy<{ firstName: string }>(compressed, keyMap);

    expect('firstName' in proxy).toBe(true);
    expect('lastName' in proxy).toBe(false);
  });

  it('supports Object.keys()', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const keys = Object.keys(proxy);
    expect(keys).toContain('firstName');
    expect(keys).toContain('lastName');
  });

  it('supports object spread {...obj}', () => {
    const compressed = { a: 'John', b: 'Doe', c: 30 };
    const keyMap = { a: 'firstName', b: 'lastName', c: 'age' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string; age: number }>(
      compressed,
      keyMap
    );

    const spread = { ...proxy };
    expect(spread.firstName).toBe('John');
    expect(spread.lastName).toBe('Doe');
    expect(spread.age).toBe(30);
    expect(Object.keys(spread)).toEqual(['firstName', 'lastName', 'age']);
  });

  it('supports Object.assign()', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const assigned = Object.assign({}, proxy);
    expect(assigned.firstName).toBe('John');
    expect(assigned.lastName).toBe('Doe');
  });

  it('supports object destructuring', () => {
    const compressed = { a: 'John', b: 'Doe', c: 'john@example.com' };
    const keyMap = { a: 'firstName', b: 'lastName', c: 'email' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string; email: string }>(
      compressed,
      keyMap
    );

    const { firstName, lastName, email } = proxy;
    expect(firstName).toBe('John');
    expect(lastName).toBe('Doe');
    expect(email).toBe('john@example.com');
  });

  it('supports JSON.stringify()', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const json = JSON.stringify(proxy);
    const parsed = JSON.parse(json);
    expect(parsed.firstName).toBe('John');
    expect(parsed.lastName).toBe('Doe');
    expect(parsed.a).toBeUndefined();
  });

  it('supports Object.entries()', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const entries = Object.entries(proxy);
    expect(entries).toContainEqual(['firstName', 'John']);
    expect(entries).toContainEqual(['lastName', 'Doe']);
  });

  it('supports Object.values()', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const values = Object.values(proxy);
    expect(values).toContain('John');
    expect(values).toContain('Doe');
  });

  it('supports for...in loop', () => {
    const compressed = { a: 'John', b: 'Doe' };
    const keyMap = { a: 'firstName', b: 'lastName' };

    const proxy = createTerseProxy<{ firstName: string; lastName: string }>(
      compressed,
      keyMap
    );

    const keys: string[] = [];
    for (const key in proxy) {
      keys.push(key);
    }
    expect(keys).toContain('firstName');
    expect(keys).toContain('lastName');
  });
});

describe('wrapWithProxy', () => {
  const testPayload = () => compress([
    { firstName: 'John', lastName: 'Doe', age: 30, active: true },
    { firstName: 'Jane', lastName: 'Smith', age: 25, active: false },
    { firstName: 'Bob', lastName: 'Wilson', age: 35, active: true },
  ]);

  it('wraps array items with proxies', () => {
    const payload = compress([
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ]);

    const wrapped = wrapWithProxy<Array<{ firstName: string; lastName: string }>>(
      payload
    );

    expect(wrapped[0].firstName).toBe('John');
    expect(wrapped[1].firstName).toBe('Jane');
  });

  it('supports array spread [...arr]', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string }>>(testPayload());
    const spread = [...wrapped];

    expect(spread.length).toBe(3);
    expect(spread[0].firstName).toBe('John');
    expect(spread[2].firstName).toBe('Bob');
  });

  it('supports array destructuring', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string }>>(testPayload());
    const [first, second, ...rest] = wrapped;

    expect(first.firstName).toBe('John');
    expect(second.firstName).toBe('Jane');
    expect(rest.length).toBe(1);
    expect(rest[0].firstName).toBe('Bob');
  });

  it('supports .map()', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string; lastName: string }>>(testPayload());
    const names = wrapped.map(u => `${u.firstName} ${u.lastName}`);

    expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Wilson']);
  });

  it('supports .filter()', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string; active: boolean }>>(testPayload());
    const active = wrapped.filter(u => u.active);

    expect(active.length).toBe(2);
    expect(active[0].firstName).toBe('John');
    expect(active[1].firstName).toBe('Bob');
  });

  it('supports .find()', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string; age: number }>>(testPayload());
    const found = wrapped.find(u => u.age === 25);

    expect(found?.firstName).toBe('Jane');
  });

  it('supports .some() and .every()', () => {
    const wrapped = wrapWithProxy<Array<{ active: boolean }>>(testPayload());

    expect(wrapped.some(u => u.active)).toBe(true);
    expect(wrapped.every(u => u.active)).toBe(false);
  });

  it('supports .reduce()', () => {
    const wrapped = wrapWithProxy<Array<{ age: number }>>(testPayload());
    const totalAge = wrapped.reduce((sum, u) => sum + u.age, 0);

    expect(totalAge).toBe(90);
  });

  it('supports .forEach()', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string }>>(testPayload());
    const names: string[] = [];
    wrapped.forEach(u => names.push(u.firstName));

    expect(names).toEqual(['John', 'Jane', 'Bob']);
  });

  it('supports for...of loop', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string }>>(testPayload());
    const names: string[] = [];
    for (const user of wrapped) {
      names.push(user.firstName);
    }

    expect(names).toEqual(['John', 'Jane', 'Bob']);
  });

  it('supports JSON.stringify() on array', () => {
    const wrapped = wrapWithProxy<Array<{ firstName: string; lastName: string }>>(testPayload());
    const json = JSON.stringify(wrapped);
    const parsed = JSON.parse(json);

    expect(parsed[0].firstName).toBe('John');
    expect(parsed[0].a).toBeUndefined(); // Short key should not appear
  });

  it('supports nested object spread', () => {
    const payload = compress([
      { user: { firstName: 'John', lastName: 'Doe' }, meta: { id: 1 } },
    ]);
    const wrapped = wrapWithProxy<Array<{ user: { firstName: string; lastName: string }; meta: { id: number } }>>(payload);

    const { user, meta } = wrapped[0];
    const spreadUser = { ...user };

    expect(spreadUser.firstName).toBe('John');
    expect(spreadUser.lastName).toBe('Doe');
    expect(meta.id).toBe(1);
  });
});

describe('compression ratio', () => {
  it('achieves significant savings on realistic data', () => {
    // Simulate realistic API response
    const users = Array.from({ length: 100 }, (_, i) => ({
      firstName: `User${i}`,
      lastName: `LastName${i}`,
      emailAddress: `user${i}@example.com`,
      phoneNumber: `555-000-${String(i).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const originalJson = JSON.stringify(users);
    const compressed = compress(users);
    const compressedJson = JSON.stringify(compressed);

    const savings = (1 - compressedJson.length / originalJson.length) * 100;

    // Should achieve at least 20% savings (more with longer keys/values)
    expect(savings).toBeGreaterThan(20);

    // Verify data integrity
    const expanded = expand(compressed);
    expect(expanded).toEqual(users);
  });
});

describe('key patterns', () => {
  const testData = [
    { firstName: 'John', lastName: 'Doe' },
    { firstName: 'Jane', lastName: 'Smith' },
  ];

  it('uses alpha pattern by default', () => {
    const result = compress(testData);
    const keys = Object.keys(result.k);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(result.p).toBe('alpha');
  });

  it('supports numeric pattern', () => {
    const result = compress(testData, { keyPattern: 'numeric' });
    const keys = Object.keys(result.k);
    expect(keys).toContain('0');
    expect(keys).toContain('1');
    expect(result.p).toBe('numeric');
  });

  it('supports alphanumeric pattern', () => {
    const result = compress(testData, { keyPattern: 'alphanumeric' });
    const keys = Object.keys(result.k);
    expect(keys[0]).toMatch(/^[a-z]\d$/);
    expect(result.p).toBe('alphanumeric');
  });

  it('supports prefixed pattern with custom prefix', () => {
    const result = compress(testData, { keyPattern: { prefix: 'json' } });
    const keys = Object.keys(result.k);
    expect(keys).toContain('json0');
    expect(keys).toContain('json1');
    expect(result.p).toBe('prefixed:json');
  });

  it('supports prefixed pattern with alpha style', () => {
    const result = compress(testData, { keyPattern: { prefix: 'f_', style: 'alpha' } });
    const keys = Object.keys(result.k);
    expect(keys).toContain('f_a');
    expect(keys).toContain('f_b');
  });

  it('supports custom key generator function', () => {
    const customGenerator = (i: number) => `field${i}`;
    const result = compress(testData, { keyPattern: customGenerator });
    const keys = Object.keys(result.k);
    expect(keys).toContain('field0');
    expect(keys).toContain('field1');
    expect(result.p).toBe('custom');
  });
});

describe('nested handling', () => {
  const nestedData = [
    {
      userName: 'john',
      profile: { displayName: 'John Doe', avatarUrl: 'http://example.com' },
      orders: [
        { productName: 'Widget', quantity: 5 },
      ],
    },
  ];

  it('compresses all nested structures with deep mode (default)', () => {
    const result = compress(nestedData, { nestedHandling: 'deep' });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).toContain('displayName');
    expect(compressedKeys).toContain('productName');
  });

  it('only compresses top-level with shallow mode', () => {
    const result = compress(nestedData, { nestedHandling: 'shallow' });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).not.toContain('displayName');
    expect(compressedKeys).not.toContain('productName');
  });

  it('only compresses nested arrays with arrays mode', () => {
    const result = compress(nestedData, { nestedHandling: 'arrays' });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).not.toContain('displayName'); // nested object, not array
    expect(compressedKeys).toContain('productName'); // nested array
  });

  it('respects numeric depth limit', () => {
    const result = compress(nestedData, { nestedHandling: 1 });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('userName');
    expect(compressedKeys).not.toContain('displayName');
  });
});

describe('key filtering', () => {
  const testData = [
    { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  ];

  it('excludes specified keys', () => {
    const result = compress(testData, { excludeKeys: ['email'] });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('firstName');
    expect(compressedKeys).not.toContain('email');
  });

  it('includes specified keys even if short', () => {
    const result = compress(testData, { includeKeys: ['id'], minKeyLength: 3 });
    const compressedKeys = Object.values(result.k);
    expect(compressedKeys).toContain('id');
  });
});
