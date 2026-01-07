# TerseJSON Demo

Real-world demonstration of TerseJSON with large datasets and live benchmarking dashboard.

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up --build
```

Then in another terminal:
```bash
# Run verification tests
npm run test

# Or run live benchmark dashboard
npm run benchmark
```

### Option 2: Local

```bash
npm install
npm start
```

Then in another terminal:
```bash
npm run test      # Run verification tests
npm run benchmark # Run live benchmark dashboard
```

## Endpoints

| Endpoint | Description | Max Records |
|----------|-------------|-------------|
| `/api/users/:count` | User data with nested address/metadata | 10,000 |
| `/api/products/:count` | Product data with nested dimensions | 10,000 |
| `/api/logs/:count` | Log entries | 50,000 |
| `/health` | Health check | - |

## Testing TerseJSON

```bash
# With TerseJSON (compressed)
curl -H "accept-terse: true" http://localhost:3000/api/users/100

# Without TerseJSON (normal JSON)
curl http://localhost:3000/api/users/100
```

## Benchmark Dashboard

Run `npm run benchmark` to see a live dashboard showing:

- Total bandwidth saved (MB)
- Compression ratios per endpoint
- Latency comparison (normal vs TerseJSON)
- Requests per second
- Historical savings data

## Verification Tests

Run `npm run test` to verify:

- Data integrity after compression/expansion
- All iteration patterns (map, filter, reduce, etc.)
- Nested object access
- Edge cases (small/large datasets)
- JSON.stringify compatibility

## Expected Results

| Dataset | Original | Compressed | Savings |
|---------|----------|------------|---------|
| 100 users | ~45 KB | ~12 KB | ~73% |
| 1000 users | ~450 KB | ~95 KB | ~79% |
| 1000 products | ~180 KB | ~45 KB | ~75% |
| 5000 logs | ~500 KB | ~120 KB | ~76% |
