# FIFA Nights League Tracker

A comprehensive web application for tracking FIFA league matches between friends, with player assignments, penalty shootouts, and detailed performance analytics.

## Features

- **Season Management**: Create seasons and import fixtures via CSV
- **Player Management**: Add players and intelligent team assignment
- **Match Tracking**: Record results with penalty shootout support (coin-flip mechanics)
- **Performance Dashboard**: Comprehensive statistics and leaderboards
- **Team Strength System**: Weighted performance tracking based on team ratings

## Quick Start

### Local Development
```bash
# Start with Docker
docker-compose up

# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

### Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting options.

## Technology Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Deployment**: Docker + Railway/Render

## Project Structure
```
├── frontend/          # React frontend
├── fifa-league-tracker/ # Backend API
├── docker-compose.yml # Local development
└── DEPLOYMENT.md     # Deployment guide
```

## CSV Import Format
```csv
home_team,away_team,match_date
Arsenal,Chelsea,2024-01-15
Liverpool,Manchester City,2024-01-16
```

Built for FIFA enthusiasts who want to track their gaming leagues with friends!