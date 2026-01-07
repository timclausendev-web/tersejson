import express from 'express';
import { terse } from 'tersejson/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable TerseJSON middleware
app.use(terse({ debug: true }));

// Generate realistic user data
function generateUsers(count) {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Legal', 'Product'];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    emailAddress: `user${i + 1}@example.com`,
    phoneNumber: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    jobTitle: ['Engineer', 'Manager', 'Analyst', 'Director', 'Coordinator'][Math.floor(Math.random() * 5)],
    salary: Math.floor(50000 + Math.random() * 150000),
    startDate: new Date(2015 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    isActive: Math.random() > 0.1,
    address: {
      streetAddress: `${Math.floor(Math.random() * 9999) + 1} Main Street`,
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
      stateProvince: ['NY', 'CA', 'IL', 'TX', 'AZ'][Math.floor(Math.random() * 5)],
      postalCode: String(Math.floor(Math.random() * 90000) + 10000),
      countryCode: 'US'
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: Math.floor(Math.random() * 500)
    }
  }));
}

// Generate product data
function generateProducts(count) {
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Automotive'];
  const adjectives = ['Premium', 'Basic', 'Professional', 'Deluxe', 'Standard', 'Ultra', 'Pro'];
  const nouns = ['Widget', 'Gadget', 'Tool', 'Device', 'Kit', 'Set', 'Pack'];

  return Array.from({ length: count }, (_, i) => ({
    productId: `PROD-${String(i + 1).padStart(6, '0')}`,
    productName: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} ${i + 1}`,
    productDescription: `High-quality product with excellent features and durability. Perfect for everyday use.`,
    categoryName: categories[Math.floor(Math.random() * categories.length)],
    unitPrice: Math.floor(Math.random() * 99900 + 100) / 100,
    stockQuantity: Math.floor(Math.random() * 1000),
    manufacturerName: ['Acme Corp', 'GlobalTech', 'MegaStore', 'QuickShip'][Math.floor(Math.random() * 4)],
    weightInGrams: Math.floor(Math.random() * 10000) + 50,
    dimensionsInCm: {
      lengthInCm: Math.floor(Math.random() * 100) + 1,
      widthInCm: Math.floor(Math.random() * 100) + 1,
      heightInCm: Math.floor(Math.random() * 100) + 1
    },
    isAvailable: Math.random() > 0.2,
    averageRating: Math.floor(Math.random() * 50) / 10,
    totalReviews: Math.floor(Math.random() * 5000),
    createdTimestamp: new Date().toISOString(),
    updatedTimestamp: new Date().toISOString()
  }));
}

// Generate log entries
function generateLogs(count) {
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'notification-service'];

  return Array.from({ length: count }, (_, i) => ({
    logId: `LOG-${Date.now()}-${i}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    logLevel: levels[Math.floor(Math.random() * levels.length)],
    serviceName: services[Math.floor(Math.random() * services.length)],
    messageText: `Operation completed successfully for request ${i + 1}`,
    requestId: `REQ-${Math.random().toString(36).substring(7)}`,
    userId: Math.random() > 0.3 ? `USER-${Math.floor(Math.random() * 10000)}` : null,
    durationMs: Math.floor(Math.random() * 5000),
    statusCode: [200, 201, 400, 404, 500][Math.floor(Math.random() * 5)],
    ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
  }));
}

// Cache generated data for consistent responses
const usersCache = {};
const productsCache = {};
const logsCache = {};

// Endpoints
app.get('/api/users/:count', (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 100, 10000);
  if (!usersCache[count]) {
    usersCache[count] = generateUsers(count);
  }
  res.json(usersCache[count]);
});

app.get('/api/products/:count', (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 100, 10000);
  if (!productsCache[count]) {
    productsCache[count] = generateProducts(count);
  }
  res.json(productsCache[count]);
});

app.get('/api/logs/:count', (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 100, 50000);
  if (!logsCache[count]) {
    logsCache[count] = generateLogs(count);
  }
  res.json(logsCache[count]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tersejson: 'enabled' });
});

app.listen(PORT, () => {
  console.log(`TerseJSON Demo Server running on port ${PORT}`);
  console.log(`
Endpoints:
  GET /api/users/:count     - Get users (max 10,000)
  GET /api/products/:count  - Get products (max 10,000)
  GET /api/logs/:count      - Get logs (max 50,000)
  GET /health               - Health check

Test with:
  curl -H "accept-terse: true" http://localhost:${PORT}/api/users/100
  `);
});
