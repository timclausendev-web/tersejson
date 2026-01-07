/**
 * TerseJSON Performance Report Generator
 *
 * Runs comprehensive benchmarks and generates a beautiful PDF report
 * comparing performance with and without TerseJSON.
 */

import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { expand, isTersePayload } from 'tersejson';
import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';

// Chart configuration
const chartWidth = 600;
const chartHeight = 300;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight });

// Benchmark data storage
const benchmarkResults = {
  bandwidth: [],
  latency: [],
  compressionRatios: [],
  timestamp: new Date().toISOString(),
};

function formatBytes(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

async function runBenchmark(endpoint, count, iterations = 5) {
  const results = {
    endpoint: `${endpoint}/${count}`,
    count,
    normalSizes: [],
    terseSizes: [],
    normalGzipSizes: [],
    terseGzipSizes: [],
    normalLatencies: [],
    terseLatencies: [],
  };

  for (let i = 0; i < iterations; i++) {
    // Normal request (without TerseJSON)
    const normalStart = performance.now();
    const normalResponse = await fetch(`${BASE_URL}${endpoint}/${count}`);
    const normalData = await normalResponse.json();
    const normalLatency = performance.now() - normalStart;
    const normalJson = JSON.stringify(normalData);
    const normalSize = normalJson.length;

    // Gzip the normal JSON
    const normalGzipped = await gzip(Buffer.from(normalJson));
    const normalGzipSize = normalGzipped.length;

    // TerseJSON request
    const terseStart = performance.now();
    const terseResponse = await fetch(`${BASE_URL}${endpoint}/${count}`, {
      headers: { 'accept-terse': 'true' }
    });
    const terseData = await terseResponse.json();
    const terseLatency = performance.now() - terseStart;
    const terseJson = JSON.stringify(terseData);
    const terseSize = terseJson.length;

    // Gzip the terse JSON
    const terseGzipped = await gzip(Buffer.from(terseJson));
    const terseGzipSize = terseGzipped.length;

    // Verify data integrity
    if (isTersePayload(terseData)) {
      const expanded = expand(terseData);
      if (expanded.length !== normalData.length) {
        throw new Error('Data integrity check failed!');
      }
    }

    results.normalSizes.push(normalSize);
    results.terseSizes.push(terseSize);
    results.normalGzipSizes.push(normalGzipSize);
    results.terseGzipSizes.push(terseGzipSize);
    results.normalLatencies.push(normalLatency);
    results.terseLatencies.push(terseLatency);
  }

  // Calculate averages
  const avgNormalSize = results.normalSizes.reduce((a, b) => a + b, 0) / iterations;
  const avgTerseSize = results.terseSizes.reduce((a, b) => a + b, 0) / iterations;
  const avgNormalGzipSize = results.normalGzipSizes.reduce((a, b) => a + b, 0) / iterations;
  const avgTerseGzipSize = results.terseGzipSizes.reduce((a, b) => a + b, 0) / iterations;
  const avgNormalLatency = results.normalLatencies.reduce((a, b) => a + b, 0) / iterations;
  const avgTerseLatency = results.terseLatencies.reduce((a, b) => a + b, 0) / iterations;

  const savingsPercent = ((avgNormalSize - avgTerseSize) / avgNormalSize * 100);
  const savingsWithGzipPercent = ((avgNormalGzipSize - avgTerseGzipSize) / avgNormalGzipSize * 100);

  return {
    ...results,
    avgNormalSize,
    avgTerseSize,
    avgNormalGzipSize,
    avgTerseGzipSize,
    avgNormalLatency,
    avgTerseLatency,
    savingsPercent,
    savingsWithGzipPercent,
    savingsBytes: avgNormalSize - avgTerseSize,
    savingsWithGzipBytes: avgNormalGzipSize - avgTerseGzipSize,
  };
}

async function generateBandwidthChart(results) {
  const labels = results.map(r => r.endpoint);
  const normalData = results.map(r => r.avgNormalSize / 1024);
  const normalGzipData = results.map(r => r.avgNormalGzipSize / 1024);
  const terseData = results.map(r => r.avgTerseSize / 1024);
  const terseGzipData = results.map(r => r.avgTerseGzipSize / 1024);

  const configuration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Normal JSON',
          data: normalData,
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'JSON + Gzip',
          data: normalGzipData,
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
        {
          label: 'TerseJSON',
          data: terseData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'TerseJSON + Gzip',
          data: terseGzipData,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Bandwidth Comparison: All Compression Methods (KB)',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Size (KB)',
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function generateLatencyChart(results) {
  const labels = results.map(r => r.endpoint);
  const normalData = results.map(r => r.avgNormalLatency);
  const terseData = results.map(r => r.avgTerseLatency);

  const configuration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Normal JSON (ms)',
          data: normalData,
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
        {
          label: 'TerseJSON (ms)',
          data: terseData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Response Time Comparison',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Latency (ms)',
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function generateSavingsChart(results) {
  const labels = results.map(r => r.endpoint);
  const savingsData = results.map(r => r.savingsPercent);

  const configuration = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: savingsData,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Compression Savings by Endpoint (%)',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'right',
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function generateScalabilityChart(results) {
  // Filter to just user endpoints for scaling visualization
  const userResults = results.filter(r => r.endpoint.includes('users'));

  const labels = userResults.map(r => r.count + ' records');
  const savingsKB = userResults.map(r => r.savingsBytes / 1024);

  const configuration = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Bandwidth Saved (KB)',
          data: savingsKB,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Savings Scale with Data Size',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Bandwidth Saved (KB)',
          },
        },
      },
    },
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

async function generatePDF(results, charts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const outputPath = `tersejson-report-${Date.now()}.pdf`;
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // Title Page
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('TerseJSON', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica').fillColor('#4a4a6a')
       .text('Performance Benchmark Report', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).fillColor('#666666')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Server: ${BASE_URL}`, { align: 'center' });

    doc.moveDown(3);

    // Executive Summary Box
    doc.roundedRect(50, doc.y, 495, 120, 10).stroke('#1a1a2e');
    const boxY = doc.y + 15;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Executive Summary', 70, boxY);

    const totalNormalSize = results.reduce((sum, r) => sum + r.avgNormalSize, 0);
    const totalNormalGzipSize = results.reduce((sum, r) => sum + r.avgNormalGzipSize, 0);
    const totalTerseSize = results.reduce((sum, r) => sum + r.avgTerseSize, 0);
    const totalTerseGzipSize = results.reduce((sum, r) => sum + r.avgTerseGzipSize, 0);
    const avgSavings = results.reduce((sum, r) => sum + r.savingsPercent, 0) / results.length;
    const avgSavingsWithGzip = results.reduce((sum, r) => sum + r.savingsWithGzipPercent, 0) / results.length;

    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Without Gzip: ${formatBytes(totalNormalSize)} → ${formatBytes(totalTerseSize)} (${avgSavings.toFixed(1)}% saved)`, 70, boxY + 25);
    doc.text(`With Gzip: ${formatBytes(totalNormalGzipSize)} → ${formatBytes(totalTerseGzipSize)} (${avgSavingsWithGzip.toFixed(1)}% additional)`, 70, boxY + 50);
    doc.text(`Best case (TerseJSON + Gzip): ${((1 - totalTerseGzipSize / totalNormalSize) * 100).toFixed(1)}% total reduction`, 70, boxY + 75);

    doc.moveDown(8);

    // Add first chart - Bandwidth Comparison
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Bandwidth Analysis', { align: 'center' });
    doc.moveDown(1);

    doc.image(charts.bandwidth, {
      fit: [500, 250],
      align: 'center',
    });

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text('This chart compares the payload sizes between standard JSON and TerseJSON responses.', {
         align: 'center',
       });

    // Detailed results table
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Detailed Results');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.rect(50, tableTop, 495, 20).fill('#1a1a2e');
    doc.text('Endpoint', 55, tableTop + 6);
    doc.text('Normal', 150, tableTop + 6);
    doc.text('+Gzip', 205, tableTop + 6);
    doc.text('Terse', 260, tableTop + 6);
    doc.text('+Gzip', 315, tableTop + 6);
    doc.text('Savings', 370, tableTop + 6);
    doc.text('w/Gzip', 430, tableTop + 6);
    doc.text('Best', 485, tableTop + 6);

    // Table rows
    let rowY = tableTop + 20;
    doc.font('Helvetica').fillColor('#333333').fontSize(7);

    results.forEach((r, i) => {
      const bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, rowY, 495, 16).fill(bgColor);
      doc.fillColor('#333333');
      doc.text(r.endpoint, 55, rowY + 4, { width: 90 });
      doc.text(formatBytes(r.avgNormalSize), 150, rowY + 4);
      doc.text(formatBytes(r.avgNormalGzipSize), 205, rowY + 4);
      doc.text(formatBytes(r.avgTerseSize), 260, rowY + 4);
      doc.text(formatBytes(r.avgTerseGzipSize), 315, rowY + 4);
      doc.text(r.savingsPercent.toFixed(0) + '%', 375, rowY + 4);
      doc.text(r.savingsWithGzipPercent.toFixed(0) + '%', 435, rowY + 4);
      const bestSavings = ((1 - r.avgTerseGzipSize / r.avgNormalSize) * 100).toFixed(0);
      doc.text(bestSavings + '%', 490, rowY + 4);
      rowY += 16;
    });

    // Latency Chart
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Latency Analysis', { align: 'center' });
    doc.moveDown(1);

    doc.image(charts.latency, {
      fit: [500, 250],
      align: 'center',
    });

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text('Response times for both JSON formats. TerseJSON adds minimal processing overhead.', {
         align: 'center',
       });

    // Scalability Chart
    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Scalability', { align: 'center' });
    doc.moveDown(1);

    doc.image(charts.scalability, {
      fit: [500, 250],
      align: 'center',
    });

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text('Bandwidth savings increase proportionally with data size.', {
         align: 'center',
       });

    // Network Speed Comparison - Desktop vs Mobile
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Network Speed Impact', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica').fillColor('#333333')
       .text('How TerseJSON affects load times across different network conditions:');
    doc.moveDown(1);

    // Network speeds in bytes per second
    const networks = [
      { name: 'Desktop (100 Mbps)', speed: 12500000 },
      { name: '4G Mobile (20 Mbps)', speed: 2500000 },
      { name: '3G Mobile (2 Mbps)', speed: 250000 },
      { name: 'Slow 3G (400 Kbps)', speed: 50000 },
    ];

    // Use a representative large payload
    const largeResult = results.find(r => r.count >= 1000) || results[results.length - 1];

    // Table header for network speeds
    const netTableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.rect(50, netTableTop, 495, 22).fill('#1a1a2e');
    doc.text('Network', 60, netTableTop + 7);
    doc.text('Normal JSON', 170, netTableTop + 7);
    doc.text('TerseJSON', 280, netTableTop + 7);
    doc.text('Time Saved', 390, netTableTop + 7);

    let netRowY = netTableTop + 22;
    doc.font('Helvetica').fillColor('#333333').fontSize(9);

    networks.forEach((net, i) => {
      const bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, netRowY, 495, 20).fill(bgColor);
      doc.fillColor('#333333');

      const normalTime = (largeResult.avgNormalSize / net.speed * 1000).toFixed(0);
      const terseTime = (largeResult.avgTerseSize / net.speed * 1000).toFixed(0);
      const savedTime = normalTime - terseTime;

      doc.text(net.name, 60, netRowY + 6);
      doc.text(`${normalTime} ms`, 180, netRowY + 6);
      doc.text(`${terseTime} ms`, 290, netRowY + 6);
      doc.fillColor('#16a34a').text(`-${savedTime} ms (${((savedTime / normalTime) * 100).toFixed(0)}% faster)`, 390, netRowY + 6);
      doc.fillColor('#333333');
      netRowY += 20;
    });

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#666666')
       .text(`Based on ${largeResult.endpoint} payload (${formatBytes(largeResult.avgNormalSize)} normal, ${formatBytes(largeResult.avgTerseSize)} compressed)`, {
         align: 'center'
       });

    // Mobile UX Impact
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Mobile User Experience Impact');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('#333333');

    const mobileSpeed = 250000; // 2 Mbps (3G)
    const normalMobileTime = largeResult.avgNormalSize / mobileSpeed * 1000;
    const terseMobileTime = largeResult.avgTerseSize / mobileSpeed * 1000;

    doc.text(`On 3G networks, your API response loads in ${terseMobileTime.toFixed(0)}ms instead of ${normalMobileTime.toFixed(0)}ms.`);
    doc.moveDown(0.5);
    doc.text(`That's ${(normalMobileTime - terseMobileTime).toFixed(0)}ms saved per request - critical for mobile user retention.`);
    doc.moveDown(0.5);
    doc.text(`Users on metered data plans also benefit from ${largeResult.savingsPercent.toFixed(0)}% less data usage.`);

    // Enterprise Projections
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a2e')
       .text('Enterprise Cost Projections', { align: 'center' });
    doc.moveDown(1);

    const totalTerseGzipSize2 = results.reduce((sum, r) => sum + r.avgTerseGzipSize, 0);
    const avgSavingsPerRequest = (totalNormalSize - totalTerseGzipSize2) / results.length;

    doc.fontSize(12).font('Helvetica').fillColor('#333333');
    doc.text('Based on your benchmark data, here are projected savings at enterprise scale:');
    doc.moveDown(1);

    const projections = [
      { requests: '1M requests/day', savings: avgSavingsPerRequest * 1000000 },
      { requests: '10M requests/day', savings: avgSavingsPerRequest * 10000000 },
      { requests: '100M requests/day', savings: avgSavingsPerRequest * 100000000 },
    ];

    projections.forEach(p => {
      const dailySavings = p.savings;
      const monthlySavings = dailySavings * 30;
      const monthlyCost = (monthlySavings / 1073741824) * 0.09; // $0.09 per GB

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e')
         .text(p.requests);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
         .text(`  Daily savings: ${formatBytes(dailySavings)}`);
      doc.text(`  Monthly savings: ${formatBytes(monthlySavings)}`);
      doc.text(`  Estimated monthly cost reduction: $${monthlyCost.toFixed(2)} (at $0.09/GB)`);
      doc.moveDown(0.5);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').fillColor('#999999')
       .text('Report generated by TerseJSON Demo Suite', { align: 'center' });
    doc.text('https://tersejson.com', { align: 'center', link: 'https://tersejson.com' });

    doc.end();

    stream.on('finish', () => {
      console.log(`\n📄 Report saved: ${outputPath}`);
      resolve(outputPath);
    });

    stream.on('error', reject);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       TerseJSON Performance Report Generator');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/health`);
  } catch {
    console.error(`❌ Server not running at ${BASE_URL}`);
    console.error('   Start the server first: PORT=3456 npm start\n');
    process.exit(1);
  }

  console.log('🔄 Running benchmarks...\n');

  // Run benchmarks for different endpoints and sizes
  const benchmarks = [
    { endpoint: '/api/users', count: 100 },
    { endpoint: '/api/users', count: 500 },
    { endpoint: '/api/users', count: 1000 },
    { endpoint: '/api/users', count: 2000 },
    { endpoint: '/api/products', count: 500 },
    { endpoint: '/api/products', count: 1000 },
    { endpoint: '/api/logs', count: 1000 },
    { endpoint: '/api/logs', count: 5000 },
  ];

  const results = [];

  for (const benchmark of benchmarks) {
    process.stdout.write(`   Testing ${benchmark.endpoint}/${benchmark.count}... `);
    const result = await runBenchmark(benchmark.endpoint, benchmark.count);
    results.push(result);
    console.log(`✓ ${result.savingsPercent.toFixed(1)}% savings`);
  }

  console.log('\n📊 Generating charts...');

  const charts = {
    bandwidth: await generateBandwidthChart(results),
    latency: await generateLatencyChart(results),
    scalability: await generateScalabilityChart(results),
  };

  console.log('📄 Creating PDF report...');

  const outputPath = await generatePDF(results, charts);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    BENCHMARK SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  const totalNormalSize = results.reduce((sum, r) => sum + r.avgNormalSize, 0);
  const totalTerseSize = results.reduce((sum, r) => sum + r.avgTerseSize, 0);
  const avgSavings = results.reduce((sum, r) => sum + r.savingsPercent, 0) / results.length;

  console.log(`   Total data tested: ${formatBytes(totalNormalSize)}`);
  console.log(`   Compressed size:   ${formatBytes(totalTerseSize)}`);
  console.log(`   Average savings:   ${avgSavings.toFixed(1)}%`);
  console.log(`   Total saved:       ${formatBytes(totalNormalSize - totalTerseSize)}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`🎉 Report generated successfully: ${outputPath}\n`);
}

main().catch(console.error);
