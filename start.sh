#!/bin/bash
set -e

# Start PostgreSQL in the background
docker compose up -d

# Wait for PostgreSQL to be healthy
echo "Waiting for database..."
until docker compose exec postgres pg_isready -U postgres -d settle_a_bet > /dev/null 2>&1; do
  sleep 1
done
echo "Database is ready."

# Run database migrations
bunx prisma migrate dev

# Start the development server
bun run dev
