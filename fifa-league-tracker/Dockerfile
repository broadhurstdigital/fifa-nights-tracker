FROM node:18-alpine

WORKDIR /app

# Install dependencies from backend directory
COPY backend/package*.json ./
RUN npm install

# Copy backend source code
COPY backend/ .

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]