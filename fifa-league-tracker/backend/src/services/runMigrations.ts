import { Pool } from 'pg';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';

// Load environment variables
dotenv.config();

async function runMigrations() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('Connecting to database...');
    await db.connect();
    console.log('Connected successfully!');

    await initializeDatabase(db);

    console.log('Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigrations();