import { describe, it, expect } from 'vitest';
import { processGraphQLResponse, createTerseLink, isGraphQLTersePayload } from './graphql-client';
import { compressGraphQLResponse } from './graphql';

describe('processGraphQLResponse', () => {
  it('expands compressed arrays with proxy (default)', () => {
    // Simulate a compressed response
    const original = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    expect(isGraphQLTersePayload(compressed)).toBe(true);

    const result = processGraphQLResponse<{ data: { users: Array<{ firstName: string; lastName: string }> } }>(compressed);

    // Access via original keys should work
    expect(result.data.users[0].firstName).toBe('John');
    expect(result.data.users[0].lastName).toBe('Doe');
    expect(result.data.users[1].firstName).toBe('Jane');
    expect(result.data.users[1].lastName).toBe('Smith');
  });

  it('expands compressed arrays with full expansion (useProxy: false)', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{ data: { users: Array<{ firstName: string; lastName: string }> } }>(
      compressed,
      { useProxy: false }
    );

    expect(result.data.users[0].firstName).toBe('John');
    expect(result.data.users[1].firstName).toBe('Jane');

    // With full expansion, Object.keys should return original keys
    expect(Object.keys(result.data.users[0])).toContain('firstName');
    expect(Object.keys(result.data.users[0])).toContain('lastName');
  });

  it('handles multiple compressed arrays', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
        products: [
          { productName: 'Widget', productPrice: 99 },
          { productName: 'Gadget', productPrice: 149 },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: {
        users: Array<{ firstName: string }>;
        products: Array<{ productName: string; productPrice: number }>;
      };
    }>(compressed);

    expect(result.data.users[0].firstName).toBe('John');
    expect(result.data.products[0].productName).toBe('Widget');
    expect(result.data.products[0].productPrice).toBe(99);
  });

  it('handles nested arrays', () => {
    const original = {
      data: {
        users: [
          {
            firstName: 'John',
            orders: [
              { productName: 'Widget', quantity: 5 },
              { productName: 'Gadget', quantity: 3 },
            ],
          },
          {
            firstName: 'Jane',
            orders: [
              { productName: 'Gizmo', quantity: 2 },
            ],
          },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: {
        users: Array<{
          firstName: string;
          orders: Array<{ productName: string; quantity: number }>;
        }>;
      };
    }>(compressed);

    expect(result.data.users[0].firstName).toBe('John');
    expect(result.data.users[0].orders[0].productName).toBe('Widget');
    expect(result.data.users[0].orders[0].quantity).toBe(5);
    expect(result.data.users[1].orders[0].productName).toBe('Gizmo');
  });

  it('preserves errors and extensions', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John' },
          { firstName: 'Jane' },
        ],
      },
      errors: [{ message: 'Some warning' }],
      extensions: { timing: 100 },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: { users: Array<{ firstName: string }> };
      errors: Array<{ message: string }>;
      extensions: { timing: number };
    }>(compressed);

    expect(result.errors).toEqual([{ message: 'Some warning' }]);
    expect(result.extensions).toEqual({ timing: 100 });
  });

  it('returns non-terse responses unchanged', () => {
    const regular = {
      data: {
        users: [{ firstName: 'John' }],
      },
    };

    const result = processGraphQLResponse(regular);

    expect(result).toEqual(regular);
  });

  it('supports Object.keys on proxied objects', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: { users: Array<{ firstName: string; lastName: string }> };
    }>(compressed);

    const keys = Object.keys(result.data.users[0]);
    expect(keys).toContain('firstName');
    expect(keys).toContain('lastName');
  });

  it('supports "in" operator on proxied objects', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: { users: Array<{ firstName: string; lastName: string }> };
    }>(compressed);

    expect('firstName' in result.data.users[0]).toBe(true);
    expect('lastName' in result.data.users[0]).toBe(true);
    expect('nonExistent' in result.data.users[0]).toBe(false);
  });

  it('supports iteration over proxied objects', () => {
    const original = {
      data: {
        users: [
          { firstName: 'John', lastName: 'Doe' },
        ],
      },
    };

    const compressed = compressGraphQLResponse(original);
    const result = processGraphQLResponse<{
      data: { users: Array<{ firstName: string; lastName: string }> };
    }>(compressed);

    const entries: [string, string][] = [];
    for (const key in result.data.users[0]) {
      entries.push([key, result.data.users[0][key as keyof typeof result.data.users[0]]]);
    }

    expect(entries).toContainEqual(['firstName', 'John']);
    expect(entries).toContainEqual(['lastName', 'Doe']);
  });
});

describe('createTerseLink', () => {
  it('returns a link-like object', () => {
    const link = createTerseLink();

    expect(link).toHaveProperty('request');
    expect(typeof link.request).toBe('function');
  });

  it('adds accept-terse header to context', () => {
    const link = createTerseLink();

    let capturedContext: Record<string, unknown> = {};

    const mockOperation = {
      getContext: () => ({}),
      setContext: (ctx: Record<string, unknown>) => {
        capturedContext = ctx;
      },
    };

    const mockForward = () => ({
      map: (fn: (result: unknown) => unknown) => fn({ data: {} }),
    });

    link.request(mockOperation, mockForward);

    expect(capturedContext.headers).toEqual({
      'accept-terse': 'true',
    });
  });

  it('processes terse responses', () => {
    const link = createTerseLink();

    const terseResponse = {
      data: {
        users: [{ a: 'John' }, { a: 'Jane' }],
      },
      __terse__: {
        v: 1,
        k: { a: 'firstName' },
        paths: ['data.users'],
      },
    };

    const mockOperation = {
      getContext: () => ({}),
      setContext: () => {},
    };

    let processedResult: unknown;
    const mockForward = () => ({
      map: (fn: (result: unknown) => unknown) => {
        processedResult = fn(terseResponse);
        return processedResult;
      },
    });

    link.request(mockOperation, mockForward);

    expect(isGraphQLTersePayload(processedResult)).toBe(false);
    expect((processedResult as { data: { users: Array<{ firstName: string }> } }).data.users[0].firstName).toBe('John');
  });

  it('passes through non-terse responses unchanged', () => {
    const link = createTerseLink();

    const regularResponse = {
      data: {
        users: [{ firstName: 'John' }],
      },
    };

    const mockOperation = {
      getContext: () => ({}),
      setContext: () => {},
    };

    let processedResult: unknown;
    const mockForward = () => ({
      map: (fn: (result: unknown) => unknown) => {
        processedResult = fn(regularResponse);
        return processedResult;
      },
    });

    link.request(mockOperation, mockForward);

    expect(processedResult).toEqual(regularResponse);
  });
});

describe('round-trip compression/expansion', () => {
  it('preserves data integrity through compression and expansion', () => {
    const original = {
      data: {
        users: [
          {
            firstName: 'John',
            lastName: 'Doe',
            emailAddress: 'john@example.com',
            phoneNumber: '555-1234',
            addresses: [
              { streetName: '123 Main St', cityName: 'Springfield' },
              { streetName: '456 Oak Ave', cityName: 'Shelbyville' },
            ],
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            emailAddress: 'jane@example.com',
            phoneNumber: '555-5678',
            addresses: [
              { streetName: '789 Elm Blvd', cityName: 'Capital City' },
            ],
          },
        ],
      },
    };

    // Compress
    const compressed = compressGraphQLResponse(original);
    expect(isGraphQLTersePayload(compressed)).toBe(true);

    // Expand with full expansion (not proxy)
    const expanded = processGraphQLResponse<typeof original>(compressed, { useProxy: false });

    // Verify all data is preserved
    expect(expanded.data.users[0].firstName).toBe('John');
    expect(expanded.data.users[0].emailAddress).toBe('john@example.com');
    expect(expanded.data.users[0].addresses[0].streetName).toBe('123 Main St');
    expect(expanded.data.users[0].addresses[1].cityName).toBe('Shelbyville');
    expect(expanded.data.users[1].firstName).toBe('Jane');
    expect(expanded.data.users[1].addresses[0].streetName).toBe('789 Elm Blvd');
  });

  it('achieves bandwidth savings', () => {
    const original = {
      data: {
        users: Array.from({ length: 100 }, (_, i) => ({
          firstName: `User${i}`,
          lastName: `LastName${i}`,
          emailAddress: `user${i}@example.com`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      },
    };

    const originalSize = JSON.stringify(original).length;
    const compressed = compressGraphQLResponse(original);
    const compressedSize = JSON.stringify(compressed).length;

    const savings = (1 - compressedSize / originalSize) * 100;

    // Should achieve meaningful savings
    expect(savings).toBeGreaterThan(15);

    // Verify data integrity
    const expanded = processGraphQLResponse<typeof original>(compressed, { useProxy: false });
    expect(expanded.data.users[50].firstName).toBe('User50');
    expect(expanded.data.users[99].emailAddress).toBe('user99@example.com');
  });
});
