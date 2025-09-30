import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { initializeDatabase } from './services/database';

// Import routes
import playerRoutes from './routes/players';
import seasonRoutes from './routes/seasons';
import teamRoutes from './routes/teams';
import fixtureRoutes from './routes/fixtures';
import matchRoutes from './routes/matches';
import cupRoutes from './routes/cups';
import penaltyRoutes from './routes/penalties';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await db.connect();
    console.log('Connected to PostgreSQL database');

    // Initialize database schema
    await initializeDatabase(db);
    console.log('Database initialization complete');

    // Middleware
    app.use(helmet());
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000',
      credentials: true,
    }));
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // API routes
    app.use('/api/players', playerRoutes);
    app.use('/api/seasons', seasonRoutes);
    app.use('/api/teams', teamRoutes);
    app.use('/api/fixtures', fixtureRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/cups', cupRoutes);
    app.use('/api/penalties', penaltyRoutes);

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;