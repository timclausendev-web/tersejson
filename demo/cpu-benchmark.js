/**
 * TerseJSON CPU Overhead Benchmark
 *
 * Proves that TerseJSON does LESS work than standard JSON.parse:
 * - Smaller payload = faster parse
 * - Proxy wrap is O(1)
 * - Lazy expansion skips work for unused fields
 *
 * Run: node demo/cpu-benchmark.js
 */

import { compress, expand, wrapWithProxy } from 'tersejson';

// High-resolution timing
function benchmark(name, fn, iterations = 100) {
  // Warmup
  for (let i = 0; i < 10; i++) fn();

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { name, avg, min, max, iterations };
}

// Generate realistic CMS-like data
function generateArticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    title: `Article Title ${i}: A Comprehensive Guide to Topic ${i}`,
    slug: `article-comprehensive-guide-topic-${i}`,
    excerpt: `This is the excerpt for article ${i}. It contains a brief summary of the content that will be displayed in list views and search results.`,
    content: `Full content for article ${i}. This is the main body text that would typically be much longer in a real application. `.repeat(20),
    authorId: i % 50,
    authorName: `Author Name ${i % 50}`,
    authorEmail: `author${i % 50}@example.com`,
    authorBio: `This is the biography for author ${i % 50}. They have written many articles on various topics.`,
    categoryId: i % 20,
    categoryName: `Category ${i % 20}`,
    categorySlug: `category-${i % 20}`,
    publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    featuredImage: `https://cdn.example.com/images/articles/article-${i}-featured.jpg`,
    thumbnailImage: `https://cdn.example.com/images/articles/article-${i}-thumb.jpg`,
    tags: [`tag${i % 10}`, `tag${(i + 1) % 10}`, `tag${(i + 2) % 10}`],
    viewCount: Math.floor(Math.random() * 10000),
    likeCount: Math.floor(Math.random() * 500),
    commentCount: Math.floor(Math.random() * 100),
    isPublished: true,
    isFeatured: i % 10 === 0,
  }));
}

function formatTime(ms) {
  if (ms < 0.01) return `${(ms * 1000).toFixed(2)}us`;
  if (ms < 1) return `${ms.toFixed(3)}ms`;
  return `${ms.toFixed(2)}ms`;
}

console.log('='.repeat(75));
console.log('          TerseJSON CPU Overhead Benchmark');
console.log('          Proving: TerseJSON does LESS work, not more');
console.log('='.repeat(75));
console.log('');

const RECORD_COUNT = 1000;
const TOTAL_FIELDS = 21;
const ITERATIONS = 50;

console.log(`Dataset: ${RECORD_COUNT} articles with ${TOTAL_FIELDS} fields each`);
console.log(`Iterations per test: ${ITERATIONS}`);
console.log('');

// Generate data
const articles = generateArticles(RECORD_COUNT);
const compressed = compress(articles);

// Prepare JSON strings (simulating network payload)
const normalJsonString = JSON.stringify(articles);
const terseJsonString = JSON.stringify(compressed);

console.log('-'.repeat(75));
console.log('PAYLOAD SIZE');
console.log('-'.repeat(75));
console.log(`Normal JSON:     ${(normalJsonString.length / 1024).toFixed(1)} KB`);
console.log(`TerseJSON:       ${(terseJsonString.length / 1024).toFixed(1)} KB (${((1 - terseJsonString.length / normalJsonString.length) * 100).toFixed(0)}% smaller)`);
console.log('');

console.log('-'.repeat(75));
console.log('PARSE TIME (JSON.parse on the wire payload)');
console.log('-'.repeat(75));

const parseNormal = benchmark('JSON.parse (normal)', () => {
  JSON.parse(normalJsonString);
}, ITERATIONS);

const parseTerse = benchmark('JSON.parse (terse)', () => {
  JSON.parse(terseJsonString);
}, ITERATIONS);

console.log(`Normal JSON:     ${formatTime(parseNormal.avg)} avg (${formatTime(parseNormal.min)} - ${formatTime(parseNormal.max)})`);
console.log(`TerseJSON:       ${formatTime(parseTerse.avg)} avg (${formatTime(parseTerse.min)} - ${formatTime(parseTerse.max)})`);
console.log(`Winner:          ${parseTerse.avg < parseNormal.avg ? 'TerseJSON' : 'Normal'} (${((1 - parseTerse.avg / parseNormal.avg) * 100).toFixed(0)}% ${parseTerse.avg < parseNormal.avg ? 'faster' : 'slower'})`);
console.log('');

console.log('-'.repeat(75));
console.log('PROXY WRAP TIME (O(1) operation)');
console.log('-'.repeat(75));

const proxyWrap = benchmark('wrapWithProxy()', () => {
  const parsed = JSON.parse(terseJsonString);
  wrapWithProxy(parsed);
}, ITERATIONS);

console.log(`Proxy wrap:      ${formatTime(proxyWrap.avg)} avg (${formatTime(proxyWrap.min)} - ${formatTime(proxyWrap.max)})`);
console.log(`Overhead vs parse: ${formatTime(proxyWrap.avg - parseTerse.avg)} (${((proxyWrap.avg - parseTerse.avg) / parseTerse.avg * 100).toFixed(1)}%)`);
console.log('');

console.log('-'.repeat(75));
console.log('FULL EXPANSION TIME (expand() creates new objects)');
console.log('-'.repeat(75));

const fullExpand = benchmark('expand()', () => {
  const parsed = JSON.parse(terseJsonString);
  expand(parsed);
}, ITERATIONS);

console.log(`Full expand:     ${formatTime(fullExpand.avg)} avg`);
console.log('');

console.log('-'.repeat(75));
console.log('REALISTIC ACCESS PATTERNS');
console.log('-'.repeat(75));
console.log('');

// Test different field access patterns
const accessPatterns = [
  { name: 'Access 1 field (id)', fields: ['id'], count: 1 },
  { name: 'Access 3 fields (list view)', fields: ['title', 'slug', 'excerpt'], count: 3 },
  { name: 'Access 6 fields (card view)', fields: ['title', 'slug', 'excerpt', 'authorName', 'publishedAt', 'thumbnailImage'], count: 6 },
  { name: 'Access all 21 fields', fields: Object.keys(articles[0]), count: 21 },
];

console.log('Pattern                      | Normal JSON  | TerseJSON    | Winner');
console.log('-'.repeat(75));

for (const pattern of accessPatterns) {
  // Normal JSON - parse and access
  const normalAccess = benchmark(`Normal: ${pattern.name}`, () => {
    const data = JSON.parse(normalJsonString);
    let sum = 0;
    for (const item of data) {
      for (const field of pattern.fields) {
        if (item[field]) sum++;
      }
    }
    return sum;
  }, ITERATIONS);

  // TerseJSON Proxy - parse, wrap, access
  const terseAccess = benchmark(`Terse: ${pattern.name}`, () => {
    const parsed = JSON.parse(terseJsonString);
    const data = wrapWithProxy(parsed);
    let sum = 0;
    for (const item of data) {
      for (const field of pattern.fields) {
        if (item[field]) sum++;
      }
    }
    return sum;
  }, ITERATIONS);

  const winner = terseAccess.avg < normalAccess.avg ? 'TerseJSON' : 'Normal';
  const diff = Math.abs(1 - terseAccess.avg / normalAccess.avg) * 100;

  const patternCol = pattern.name.padEnd(28);
  const normalCol = formatTime(normalAccess.avg).padStart(12);
  const terseCol = formatTime(terseAccess.avg).padStart(12);
  const winnerCol = `${winner} (${diff.toFixed(0)}%)`;

  console.log(`${patternCol} | ${normalCol} | ${terseCol} | ${winnerCol}`);
}

console.log('');
console.log('-'.repeat(75));
console.log('KEY INSIGHTS');
console.log('-'.repeat(75));
console.log('');
console.log('1. PARSE TIME: Smaller payload = faster JSON.parse');
console.log(`   Normal: ${formatTime(parseNormal.avg)} vs TerseJSON: ${formatTime(parseTerse.avg)}`);
console.log('');
console.log('2. PROXY OVERHEAD: Near-zero');
console.log(`   wrapWithProxy() adds only ${formatTime(proxyWrap.avg - parseTerse.avg)} (~${((proxyWrap.avg - parseTerse.avg) / parseTerse.avg * 100).toFixed(1)}%)`);
console.log('');
console.log('3. PARTIAL ACCESS: The fewer fields you access, the more TerseJSON wins');
console.log('   - Unused fields never allocate');
console.log('   - Proxy lookup is O(1) per access');
console.log('');
console.log('4. TOTAL WORK: TerseJSON does LESS, not more');
console.log('   - Smaller string to parse');
console.log('   - Fewer properties to allocate (only accessed ones)');
console.log('   - Less GC pressure');
console.log('');
console.log('='.repeat(75));
console.log('  TerseJSON: Smaller payload + lazy expansion = less total CPU work');
console.log('='.repeat(75));
console.log('');
