FROM node:18-alpine

WORKDIR /app

# Copy backend package.json and install dependencies
COPY fifa-league-tracker/backend/package*.json ./
RUN npm install

# Copy backend source code
COPY fifa-league-tracker/backend/ .

# Copy database schema
COPY fifa-league-tracker/database/ ./database/

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]