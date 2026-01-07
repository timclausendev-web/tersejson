/**
 * TerseJSON Benchmark with Real-Time Dashboard
 *
 * Runs continuous benchmarks and displays results in a live dashboard
 */

import { compress, expand, isTersePayload, wrapWithProxy } from 'tersejson';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Stats tracking
const stats = {
  totalRequests: 0,
  totalBytesSaved: 0,
  totalOriginalBytes: 0,
  totalCompressedBytes: 0,
  avgLatencyNormal: 0,
  avgLatencyTerse: 0,
  latencyHistory: [],
  savingsHistory: [],
  requestsPerSecond: 0,
  startTime: Date.now()
};

function formatBytes(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

function formatDuration(ms) {
  if (ms >= 60000) return (ms / 60000).toFixed(1) + ' min';
  if (ms >= 1000) return (ms / 1000).toFixed(1) + ' sec';
  return ms + ' ms';
}

function createProgressBar(value, max, width = 30) {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function renderDashboard() {
  clearScreen();

  const runtime = Date.now() - stats.startTime;
  const savingsPercent = stats.totalOriginalBytes > 0
    ? ((stats.totalBytesSaved / stats.totalOriginalBytes) * 100).toFixed(1)
    : 0;
  const rps = stats.totalRequests / (runtime / 1000);

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    🚀 TerseJSON Live Benchmark Dashboard                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ⏱️  Runtime: ${formatDuration(runtime).padEnd(15)}       📊 Requests: ${String(stats.totalRequests).padEnd(10)} ║
║  🔄 Req/sec: ${rps.toFixed(1).padEnd(15)}                                          ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                           💾 BANDWIDTH SAVINGS                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Original Data:    ${formatBytes(stats.totalOriginalBytes).padEnd(15)}                              ║
║  Compressed Data:  ${formatBytes(stats.totalCompressedBytes).padEnd(15)}                              ║
║  Total Saved:      ${formatBytes(stats.totalBytesSaved).padEnd(15)}  (${savingsPercent}%)                   ║
║                                                                          ║
║  Savings: ${createProgressBar(parseFloat(savingsPercent), 100, 50)} ${savingsPercent}%    ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                           ⚡ LATENCY COMPARISON                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Normal JSON:      ${String(stats.avgLatencyNormal.toFixed(0) + ' ms').padEnd(15)}                              ║
║  TerseJSON:        ${String(stats.avgLatencyTerse.toFixed(0) + ' ms').padEnd(15)}                              ║
║  Improvement:      ${String(((1 - stats.avgLatencyTerse / Math.max(stats.avgLatencyNormal, 1)) * 100).toFixed(1) + '%').padEnd(15)}                              ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║                         📈 RECENT HISTORY (last 10)                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║`);

  // Show last 10 savings
  const recentSavings = stats.savingsHistory.slice(-10);
  recentSavings.forEach((s, i) => {
    const bar = createProgressBar(s.savingsPercent, 100, 30);
    console.log(`║  ${String(i + 1).padStart(2)}. ${s.endpoint.padEnd(20)} ${bar} ${s.savingsPercent.toFixed(1)}%  ║`);
  });

  // Pad if less than 10
  for (let i = recentSavings.length; i < 10; i++) {
    console.log(`║                                                                          ║`);
  }

  console.log(`║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop                                                    ║
╚══════════════════════════════════════════════════════════════════════════╝
`);
}

async function runBenchmark(endpoint, count) {
  try {
    // Normal request
    const normalStart = Date.now();
    const normalResponse = await fetch(`${BASE_URL}${endpoint}/${count}`);
    const normalData = await normalResponse.json();
    const normalLatency = Date.now() - normalStart;
    const normalSize = JSON.stringify(normalData).length;

    // TerseJSON request
    const terseStart = Date.now();
    const terseResponse = await fetch(`${BASE_URL}${endpoint}/${count}`, {
      headers: { 'accept-terse': 'true' }
    });
    const terseData = await terseResponse.json();
    const terseLatency = Date.now() - terseStart;
    const terseSize = JSON.stringify(terseData).length;

    // Verify data integrity
    if (isTersePayload(terseData)) {
      const expanded = expand(terseData);
      if (expanded.length !== normalData.length) {
        console.error('Data integrity error!');
        return;
      }
    }

    // Update stats
    stats.totalRequests++;
    stats.totalOriginalBytes += normalSize;
    stats.totalCompressedBytes += terseSize;
    stats.totalBytesSaved += (normalSize - terseSize);

    // Update latency averages
    stats.latencyHistory.push({ normal: normalLatency, terse: terseLatency });
    if (stats.latencyHistory.length > 100) stats.latencyHistory.shift();

    const recentLatencies = stats.latencyHistory.slice(-20);
    stats.avgLatencyNormal = recentLatencies.reduce((sum, l) => sum + l.normal, 0) / recentLatencies.length;
    stats.avgLatencyTerse = recentLatencies.reduce((sum, l) => sum + l.terse, 0) / recentLatencies.length;

    // Add to savings history
    const savingsPercent = ((normalSize - terseSize) / normalSize) * 100;
    stats.savingsHistory.push({
      endpoint: `${endpoint}/${count}`,
      savingsPercent,
      normalSize,
      terseSize
    });
    if (stats.savingsHistory.length > 100) stats.savingsHistory.shift();

  } catch (error) {
    // Silent fail, will retry
  }
}

async function runContinuousBenchmark() {
  const endpoints = [
    { path: '/api/users', counts: [100, 500, 1000, 2000] },
    { path: '/api/products', counts: [100, 500, 1000] },
    { path: '/api/logs', counts: [500, 1000, 2000, 5000] }
  ];

  console.log('Starting TerseJSON benchmark...');
  console.log('Waiting for server...\n');

  // Wait for server
  let serverReady = false;
  while (!serverReady) {
    try {
      await fetch(`${BASE_URL}/health`);
      serverReady = true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Start dashboard render loop
  setInterval(renderDashboard, 500);

  // Run continuous benchmarks
  while (true) {
    for (const endpoint of endpoints) {
      for (const count of endpoint.counts) {
        await runBenchmark(endpoint.path, count);
        await new Promise(r => setTimeout(r, 100)); // Small delay between requests
      }
    }
  }
}

runContinuousBenchmark().catch(console.error);
