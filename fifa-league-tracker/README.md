# FIFA League Tracker

A comprehensive web application for tracking FIFA league performance across multiple players and competitions.

## Features

- **Player Management**: Create and manage players participating in FIFA leagues
- **Season Management**: Set up seasons for different leagues (Premier League, Championship, etc.)
- **CSV Import**: Import league fixtures from CSV files with automatic team recognition
- **Player Assignment**: Intelligent algorithm to assign opposition players fairly across fixtures
- **Match Recording**: Record match results and track performance across multiple contexts
- **Penalty Shootouts**: Interactive coin-flip based penalty system for drawn matches
- **Cup Competitions**: Support for FA Cup and EFL Cup with automatic fixture generation
- **Performance Tracking**: Comprehensive statistics for chosen team and opposition performances
- **Team Strength Weighting**: Configurable team ratings to influence match simulation

## Technology Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with comprehensive relational schema
- **File Processing**: Multer + CSV-Parser for fixture imports
- **Frontend**: React + TypeScript (to be implemented)
- **Deployment**: Docker containers

## Project Structure

```
fifa-league-tracker/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── models/         # TypeScript type definitions
│   │   ├── services/       # Business logic (assignments, penalties)
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── Dockerfile
├── frontend/               # React application (to be implemented)
├── database/
│   └── migrations/         # SQL schema and initial data
└── docker-compose.yml      # Multi-container setup
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### Using Docker (Recommended)

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Start the services:
   ```bash
   docker-compose up -d
   ```
4. The API will be available at `http://localhost:3001`

### Manual Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Set up PostgreSQL database and run migrations:
   ```bash
   psql -U postgres -c "CREATE DATABASE fifa_league;"
   psql -U postgres -d fifa_league -f ../database/migrations/001_initial_schema.sql
   ```

3. Configure environment variables in `backend/.env`

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Core Resources

- **Players**: `/api/players`
  - CRUD operations for player management
  - Player statistics and performance tracking

- **Seasons**: `/api/seasons`
  - Season creation and management
  - Player-team assignments
  - Season leaderboards

- **Teams**: `/api/teams`
  - Team management with strength ratings
  - League and country filtering

- **Fixtures**: `/api/fixtures`
  - CSV import for league fixtures
  - Fixture management by season/round

- **Matches**: `/api/matches`
  - Match creation and score recording
  - Player assignment automation
  - Performance tracking

- **Cups**: `/api/cups`
  - Cup competition management
  - Fixture generation for tournaments

- **Penalties**: `/api/penalties`
  - Penalty shootout simulation
  - Interactive coin-flip mechanics

### Key Workflows

1. **Season Setup**:
   - Create season → Add players → Import CSV fixtures → Assign players to fixtures

2. **Match Day**:
   - Record match scores → Automatic performance tracking → Handle drawn matches with penalties

3. **Competition Analysis**:
   - View leaderboards → Player statistics → Assignment fairness metrics

## CSV Import Format

The system expects CSV files with the following columns:

```csv
Match Number,Round Number,Date,Location,Home Team,Away Team,Result
1,1,08/08/2025 20:00,Stadium Name,Team A,Team B,
```

- **Match Number**: Unique identifier for the fixture
- **Round Number**: League round/gameweek
- **Date**: Match date (optional)
- **Location**: Stadium/venue (optional)
- **Home Team**: Exact team name (must exist in database)
- **Away Team**: Exact team name (must exist in database)
- **Result**: Ignored during import

## Player Assignment Algorithm

The system automatically assigns opposition players to fixtures ensuring:

- Players don't play as their chosen team
- Fair distribution of assignments across all players
- Balanced workload throughout the season
- No player plays multiple roles in the same fixture

## Penalty Shootout System

When matches end in draws, the system simulates penalty shootouts using:

- Coin flip mechanics (heads/tails guessing)
- Descriptive penalty attempt messages
- Sudden death for tied shootouts
- Integration with cup competition progression

## Database Schema

The system uses a comprehensive PostgreSQL schema with:

- **Core Entities**: Players, Teams, Seasons, Fixtures, Matches
- **Performance Tracking**: Multiple performance contexts per player
- **Cup Support**: Separate fixture and match tables for tournaments
- **Penalty System**: Detailed shootout and attempt logging
- **Statistics**: Optimized queries for leaderboards and analytics

## Development

### Running Tests

```bash
cd backend
npm test
```

### Code Quality

```bash
npm run lint
npm run format
```

### Database Migrations

```bash
psql -U postgres -d fifa_league -f database/migrations/new_migration.sql
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

Private project for FIFA league tracking among friends.

## Support

For issues or questions, please contact the project maintainer.