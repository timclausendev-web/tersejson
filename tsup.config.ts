import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    express: 'src/express.ts',
    client: 'src/client.ts',
    integrations: 'src/integrations.ts',
    analytics: 'src/analytics.ts',
    graphql: 'src/graphql.ts',
    'graphql-client': 'src/graphql-client.ts',
    'server-memory': 'src/server-memory.ts',
    mongodb: 'src/mongodb.ts',
    pg: 'src/pg.ts',
    mysql: 'src/mysql.ts',
    sqlite: 'src/sqlite.ts',
    sequelize: 'src/sequelize.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['express', 'mongodb', 'pg', 'mysql2', 'mysql2/promise', 'better-sqlite3', 'sequelize'],
});
