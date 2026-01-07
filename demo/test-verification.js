/**
 * TerseJSON Verification Test Suite
 *
 * This script thoroughly tests TerseJSON in real-world scenarios:
 * - Data integrity (all fields accessible after compression)
 * - Various data sizes (100 to 10,000 records)
 * - Nested objects
 * - Different data types (strings, numbers, booleans, dates, null)
 * - Comparison with/without TerseJSON
 */

import { createFetch } from 'tersejson/client';
import { expand, isTersePayload, wrapWithProxy } from 'tersejson';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const terseFetch = createFetch();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${name}`);
  } else {
    failedTests++;
    console.log(`  ✗ ${name}`);
    if (details) console.log(`    ${details}`);
  }
}

async function testEndpoint(endpoint, count) {
  console.log(`\n📦 Testing ${endpoint} with ${count} records...`);

  try {
    // Fetch with TerseJSON
    const terseResponse = await fetch(`${BASE_URL}${endpoint}/${count}`, {
      headers: { 'accept-terse': 'true' }
    });
    const terseRaw = await terseResponse.json();

    // Fetch without TerseJSON
    const normalResponse = await fetch(`${BASE_URL}${endpoint}/${count}`);
    const normalData = await normalResponse.json();

    // Check if we got a terse payload
    const isTerse = isTersePayload(terseRaw);
    test('Response is TerseJSON payload', isTerse);

    if (!isTerse) {
      console.log('    Skipping remaining tests - not a TerseJSON payload');
      return;
    }

    // Test both expansion methods
    const expanded = expand(terseRaw);
    const proxied = wrapWithProxy(terseRaw);

    // Verify record count
    test('Expanded data has correct count', expanded.length === count,
      `Expected ${count}, got ${expanded.length}`);
    test('Proxied data has correct count', proxied.length === count,
      `Expected ${count}, got ${proxied.length}`);
    test('Normal data has correct count', normalData.length === count,
      `Expected ${count}, got ${normalData.length}`);

    // Verify first record integrity
    const expandedFirst = expanded[0];
    const proxiedFirst = proxied[0];
    const normalFirst = normalData[0];

    // Check all keys are accessible
    const keys = Object.keys(normalFirst);
    let allKeysAccessible = true;
    let keyMismatches = [];

    for (const key of keys) {
      if (typeof normalFirst[key] === 'object' && normalFirst[key] !== null) {
        // Check nested object
        const nestedKeys = Object.keys(normalFirst[key]);
        for (const nestedKey of nestedKeys) {
          const expandedVal = expandedFirst[key]?.[nestedKey];
          const proxiedVal = proxiedFirst[key]?.[nestedKey];
          const normalVal = normalFirst[key][nestedKey];

          if (JSON.stringify(expandedVal) !== JSON.stringify(normalVal)) {
            allKeysAccessible = false;
            keyMismatches.push(`${key}.${nestedKey}: expanded=${expandedVal}, normal=${normalVal}`);
          }
          if (JSON.stringify(proxiedVal) !== JSON.stringify(normalVal)) {
            allKeysAccessible = false;
            keyMismatches.push(`${key}.${nestedKey}: proxied=${proxiedVal}, normal=${normalVal}`);
          }
        }
      } else {
        const expandedVal = expandedFirst[key];
        const proxiedVal = proxiedFirst[key];
        const normalVal = normalFirst[key];

        if (JSON.stringify(expandedVal) !== JSON.stringify(normalVal)) {
          allKeysAccessible = false;
          keyMismatches.push(`${key}: expanded=${expandedVal}, normal=${normalVal}`);
        }
        if (JSON.stringify(proxiedVal) !== JSON.stringify(normalVal)) {
          allKeysAccessible = false;
          keyMismatches.push(`${key}: proxied=${proxiedVal}, normal=${normalVal}`);
        }
      }
    }

    test('All keys accessible via expand()', keyMismatches.filter(m => m.includes('expanded')).length === 0,
      keyMismatches.filter(m => m.includes('expanded')).join(', '));
    test('All keys accessible via wrapWithProxy()', keyMismatches.filter(m => m.includes('proxied')).length === 0,
      keyMismatches.filter(m => m.includes('proxied')).join(', '));

    // Verify middle and last records
    const midIndex = Math.floor(count / 2);
    const lastIndex = count - 1;

    test('Middle record accessible',
      JSON.stringify(Object.keys(expanded[midIndex]).sort()) === JSON.stringify(Object.keys(normalData[midIndex]).sort()));
    test('Last record accessible',
      JSON.stringify(Object.keys(expanded[lastIndex]).sort()) === JSON.stringify(Object.keys(normalData[lastIndex]).sort()));

    // Calculate size savings
    const terseSize = JSON.stringify(terseRaw).length;
    const normalSize = JSON.stringify(normalData).length;
    const savings = ((normalSize - terseSize) / normalSize * 100).toFixed(1);

    console.log(`\n  📊 Size: ${(normalSize / 1024).toFixed(1)}KB → ${(terseSize / 1024).toFixed(1)}KB (${savings}% savings)`);

    test('Compression provides savings', terseSize < normalSize,
      `Terse: ${terseSize}, Normal: ${normalSize}`);

  } catch (error) {
    console.log(`  ✗ Error testing endpoint: ${error.message}`);
    failedTests++;
    totalTests++;
  }
}

async function testIterationPatterns() {
  console.log('\n🔄 Testing iteration patterns...');

  try {
    const response = await fetch(`${BASE_URL}/api/users/100`, {
      headers: { 'accept-terse': 'true' }
    });
    const terseRaw = await response.json();
    const data = wrapWithProxy(terseRaw);

    // Test forEach
    let forEachCount = 0;
    data.forEach(item => {
      if (item.firstName && item.lastName) forEachCount++;
    });
    test('forEach iteration works', forEachCount === 100);

    // Test map
    const mapped = data.map(item => `${item.firstName} ${item.lastName}`);
    test('map() works correctly', mapped.length === 100 && mapped[0].includes(' '));

    // Test filter
    const filtered = data.filter(item => item.isActive);
    test('filter() works correctly', filtered.length > 0 && filtered.length <= 100);

    // Test find
    const found = data.find(item => item.id === 50);
    test('find() works correctly', found && found.id === 50);

    // Test some/every
    const hasActive = data.some(item => item.isActive);
    test('some() works correctly', hasActive);

    // Test reduce
    const totalSalary = data.reduce((sum, item) => sum + item.salary, 0);
    test('reduce() works correctly', totalSalary > 0);

    // Test spread operator
    const spreadArray = [...data];
    test('Spread operator works', spreadArray.length === 100);

    // Test destructuring
    const [first, second, ...rest] = data;
    test('Array destructuring works', first.id === 1 && second.id === 2 && rest.length === 98);

    // Test JSON.stringify
    const jsonString = JSON.stringify(data[0]);
    const parsed = JSON.parse(jsonString);
    test('JSON.stringify works', parsed.firstName && parsed.lastName);

  } catch (error) {
    console.log(`  ✗ Error testing iteration patterns: ${error.message}`);
    failedTests++;
    totalTests++;
  }
}

async function testNestedData() {
  console.log('\n🏗️  Testing nested object access...');

  try {
    const response = await fetch(`${BASE_URL}/api/users/100`, {
      headers: { 'accept-terse': 'true' }
    });
    const terseRaw = await response.json();
    const data = wrapWithProxy(terseRaw);

    // Test nested object access
    const user = data[0];
    test('Nested address.city accessible', typeof user.address?.city === 'string');
    test('Nested address.streetAddress accessible', typeof user.address?.streetAddress === 'string');
    test('Nested metadata.loginCount accessible', typeof user.metadata?.loginCount === 'number');

    // Test nested destructuring
    const { address: { city, postalCode }, metadata: { loginCount } } = data[0];
    test('Nested destructuring works', city && postalCode && typeof loginCount === 'number');

  } catch (error) {
    console.log(`  ✗ Error testing nested data: ${error.message}`);
    failedTests++;
    totalTests++;
  }
}

async function testEdgeCases() {
  console.log('\n⚡ Testing edge cases...');

  try {
    // Test with minimum data
    const response1 = await fetch(`${BASE_URL}/api/users/5`, {
      headers: { 'accept-terse': 'true' }
    });
    const data1 = await response1.json();
    test('Small dataset (5 records) handled', Array.isArray(data1.d) || Array.isArray(data1));

    // Test with large data
    const response2 = await fetch(`${BASE_URL}/api/logs/5000`, {
      headers: { 'accept-terse': 'true' }
    });
    const data2 = await response2.json();
    const expanded2 = isTersePayload(data2) ? expand(data2) : data2;
    test('Large dataset (5000 records) handled', expanded2.length === 5000);

    // Test without accept-terse header (should return normal JSON)
    const response3 = await fetch(`${BASE_URL}/api/users/10`);
    const data3 = await response3.json();
    test('Normal JSON when no accept-terse header', !isTersePayload(data3) && Array.isArray(data3));

  } catch (error) {
    console.log(`  ✗ Error testing edge cases: ${error.message}`);
    failedTests++;
    totalTests++;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       TerseJSON Verification Test Suite');
  console.log('═══════════════════════════════════════════════════════════');

  // Test different endpoints and sizes
  await testEndpoint('/api/users', 100);
  await testEndpoint('/api/users', 1000);
  await testEndpoint('/api/products', 500);
  await testEndpoint('/api/logs', 2000);

  // Test iteration patterns
  await testIterationPatterns();

  // Test nested data
  await testNestedData();

  // Test edge cases
  await testEdgeCases();

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests} ✓`);
  console.log(`  Failed: ${failedTests} ✗`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! TerseJSON is working correctly.\n');
    process.exit(0);
  }
}

// Check if server is running
fetch(`${BASE_URL}/health`)
  .then(() => runAllTests())
  .catch(() => {
    console.error(`\n❌ Server not running at ${BASE_URL}`);
    console.error('   Start the server first: npm start\n');
    process.exit(1);
  });
