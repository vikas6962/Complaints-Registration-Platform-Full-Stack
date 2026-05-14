import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

client.connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    console.log('Connected to:', process.env.DATABASE_URL.split('@')[1]);
    return client.end();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:');
    console.error('Error:', err.message);
    process.exit(1);
  });
