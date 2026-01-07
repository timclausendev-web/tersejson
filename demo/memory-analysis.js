/**
 * TerseJSON Memory Efficiency Analysis
 *
 * Compares client-side memory usage between:
 * - Regular JSON (full objects in memory)
 * - TerseJSON Proxy (compressed, lazy expansion)
 *
 * Run: node memory-analysis.js
 */

import { compress, expand, wrapWithProxy } from 'tersejson';
import v8 from 'v8';

// Force garbage collection if available
function gc() {
  if (global.gc) {
    global.gc();
  }
}

// Get heap size in bytes
function getHeapUsed() {
  gc();
  return process.memoryUsage().heapUsed;
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes < 0) return `-${formatBytes(-bytes)}`;
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
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

// Simulate accessing specific fields (like a real app would)
function accessFields(data, fieldNames) {
  return data.map(item => {
    const result = {};
    for (const field of fieldNames) {
      result[field] = item[field];
    }
    return result;
  });
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log('          TerseJSON Memory Efficiency Analysis');
console.log('═══════════════════════════════════════════════════════════════════\n');

const RECORD_COUNT = 1000;
const TOTAL_FIELDS = 21;

console.log(`Dataset: ${RECORD_COUNT} articles with ${TOTAL_FIELDS} fields each\n`);

// Generate base data
const articles = generateArticles(RECORD_COUNT);
const compressed = compress(articles);

// Calculate payload sizes
const normalJsonSize = JSON.stringify(articles).length;
const terseJsonSize = JSON.stringify(compressed).length;
const payloadSavings = ((normalJsonSize - terseJsonSize) / normalJsonSize * 100).toFixed(1);

console.log('─────────────────────────────────────────────────────────────────────');
console.log('PAYLOAD SIZE (what gets sent over the network)');
console.log('─────────────────────────────────────────────────────────────────────');
console.log(`Normal JSON:     ${formatBytes(normalJsonSize)}`);
console.log(`TerseJSON:       ${formatBytes(terseJsonSize)} (${payloadSavings}% smaller)`);
console.log('');

// Memory analysis for different field access patterns
const fieldSets = [
  { name: '1 field (id only)', fields: ['id'] },
  { name: '2 fields (list link)', fields: ['title', 'slug'] },
  { name: '3 fields (list view)', fields: ['title', 'slug', 'excerpt'] },
  { name: '4 fields (card view)', fields: ['title', 'slug', 'excerpt', 'thumbnailImage'] },
  { name: '5 fields (preview)', fields: ['title', 'slug', 'excerpt', 'authorName', 'publishedAt'] },
  { name: '6 fields (full card)', fields: ['title', 'slug', 'excerpt', 'authorName', 'publishedAt', 'categoryName'] },
  { name: 'All 21 fields', fields: Object.keys(articles[0]) },
];

console.log('─────────────────────────────────────────────────────────────────────');
console.log('MEMORY ANALYSIS BY FIELDS ACCESSED');
console.log('─────────────────────────────────────────────────────────────────────');
console.log('');
console.log('Scenario                    │ Normal JSON │ TerseJSON   │ Memory Saved');
console.log('────────────────────────────┼─────────────┼─────────────┼─────────────');

const results = [];

for (const { name, fields } of fieldSets) {
  // Measure normal JSON memory
  gc();
  const normalBefore = getHeapUsed();
  const normalData = JSON.parse(JSON.stringify(articles)); // Simulate receiving JSON
  const normalAccessed = accessFields(normalData, fields);
  const normalAfter = getHeapUsed();
  const normalMemory = normalAfter - normalBefore;

  // Clear and measure TerseJSON memory
  gc();
  const terseBefore = getHeapUsed();
  const terseData = JSON.parse(JSON.stringify(compressed)); // Simulate receiving TerseJSON
  const proxied = wrapWithProxy(terseData);
  const terseAccessed = accessFields(proxied, fields);
  const terseAfter = getHeapUsed();
  const terseMemory = terseAfter - terseBefore;

  const savings = normalMemory - terseMemory;
  const savingsPercent = ((savings / normalMemory) * 100).toFixed(0);

  results.push({
    name,
    fields: fields.length,
    normalMemory,
    terseMemory,
    savings,
    savingsPercent
  });

  const nameCol = name.padEnd(27);
  const normalCol = formatBytes(normalMemory).padStart(11);
  const terseCol = formatBytes(terseMemory).padStart(11);
  const savingsCol = savings > 0
    ? `${formatBytes(savings)} (${savingsPercent}%)`.padStart(12)
    : 'N/A'.padStart(12);

  console.log(`${nameCol} │ ${normalCol} │ ${terseCol} │ ${savingsCol}`);
}

console.log('');
console.log('─────────────────────────────────────────────────────────────────────');
console.log('KEY INSIGHTS');
console.log('─────────────────────────────────────────────────────────────────────');
console.log('');

// Calculate averages for partial access (1-6 fields)
const partialResults = results.filter(r => r.fields <= 6);
const avgSavings = partialResults.reduce((sum, r) => sum + r.savings, 0) / partialResults.length;
const avgSavingsPercent = partialResults.reduce((sum, r) => sum + parseInt(r.savingsPercent), 0) / partialResults.length;

console.log(`1. PAYLOAD SAVINGS: ${payloadSavings}% smaller over the network`);
console.log(`   Normal: ${formatBytes(normalJsonSize)} → TerseJSON: ${formatBytes(terseJsonSize)}`);
console.log('');
console.log(`2. MEMORY SAVINGS (partial field access):`);
console.log(`   Average: ${formatBytes(avgSavings)} saved (${avgSavingsPercent.toFixed(0)}% reduction)`);
console.log('');
console.log('3. USE CASE BENEFITS:');
console.log('   • CMS list views: Only title/slug/excerpt needed');
console.log('   • Dashboards: Aggregate data, few fields per record');
console.log('   • Mobile apps: Memory-constrained, partial rendering');
console.log('   • Infinite scroll: Large arrays, minimal display fields');
console.log('');
console.log('4. VS BINARY FORMATS (Protobuf, MessagePack):');
console.log('   • Binary = Full deserialization required');
console.log('   • TerseJSON Proxy = Lazy expansion on access');
console.log('   • Accessing 3/21 fields = 85% of keys never translated');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  TerseJSON: Smaller payloads AND lower memory usage');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Output JSON for programmatic use
const report = {
  recordCount: RECORD_COUNT,
  totalFields: TOTAL_FIELDS,
  payloadSize: {
    normalJson: normalJsonSize,
    terseJson: terseJsonSize,
    savingsPercent: parseFloat(payloadSavings)
  },
  memoryByFieldsAccessed: results.map(r => ({
    scenario: r.name,
    fieldsAccessed: r.fields,
    normalJsonMemory: r.normalMemory,
    terseJsonMemory: r.terseMemory,
    memorySaved: r.savings,
    savingsPercent: parseInt(r.savingsPercent)
  }))
};

console.log('Raw data (JSON):');
console.log(JSON.stringify(report, null, 2));
