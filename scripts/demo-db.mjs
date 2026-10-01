import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = join(projectRoot, '.demo-db');
const databaseDir = join(demoDir, 'cluster');
const configPath = join(demoDir, 'config.json');
const envPath = join(projectRoot, '.env.demo');
const database = 'citabox_demo';
const user = 'citabox_demo';
const port = 5433;
const chromeCandidates = process.platform === 'win32'
  ? [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ]
  : [];
const browserExecutable = chromeCandidates.find((candidate) => existsSync(candidate));

mkdirSync(demoDir, { recursive: true });
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : { password: randomBytes(24).toString('hex'), jwtSecret: randomBytes(48).toString('hex') };
if (!existsSync(configPath)) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const databaseUrl = `postgresql://${user}:${config.password}@127.0.0.1:${port}/${database}`;
writeFileSync(envPath, [
  `DATABASE_URL=${databaseUrl}`,
  `JWT_SECRET=${config.jwtSecret}`,
  'CORS_ORIGINS=http://localhost:3000',
  'FRONTEND_URL=http://localhost:3000',
  'PORT=3001',
  'ENABLE_SWAGGER=false',
  ...(browserExecutable ? [`PUPPETEER_EXECUTABLE_PATH=${browserExecutable}`] : []),
  '',
].join('\n'));

const pg = new EmbeddedPostgres({
  databaseDir,
  user,
  password: config.password,
  port,
  persistent: true,
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog: () => {},
});

try {
  if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  await client.end();
  if (existing.rowCount === 0) {
    await pg.createDatabase(database);
  }
  console.log('Demo PostgreSQL ready on 127.0.0.1:5433. Keep this terminal open.');
  process.stdin.resume();
} catch (error) {
  console.error('Could not start demo PostgreSQL:', error);
  process.exitCode = 1;
}
