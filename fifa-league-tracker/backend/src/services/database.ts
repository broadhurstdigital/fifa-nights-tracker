import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function initializeDatabase(db: Pool): Promise<void> {
  try {
    console.log('Checking database schema...');

    // Check if tables already exist
    const checkTablesQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'players'
      );
    `;

    const result = await db.query(checkTablesQuery);
    const tablesExist = result.rows[0].exists;

    if (tablesExist) {
      console.log('Database schema already exists. Skipping migration.');
      return;
    }

    console.log('Database schema not found. Running initial migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../../database/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.query(migrationSQL);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}