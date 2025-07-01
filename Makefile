# Install project dependencies
install:
	npm install

# Build the project
build:
	npm run build

# Run the application locally
dev:
	npm run dev

# Run the application tests
test:
	npm run test

# Start the database in Docker
up-db:
	docker-compose -f docker-compose.dev.yml up -d db

# Start the test database in Docker
up-test-db:
	docker-compose -f docker-compose.dev.yml up -d test-db

# Stop the database
down-db:
	docker-compose -f docker-compose.dev.yml down

# Stop the test database
down-test-db:
	docker-compose -f docker-compose.dev.yml down -v test-db

# run prisma studio
studio:
	npx prisma studio

# seeding database
seed:
	npx prisma db seed

# Lint the code to ensure code style consistency
lint:
	npm run lint

# Format the code automatically
format:
	npm run format

# Type-check the TypeScript code
typecheck:
	npm run typecheck

# Tail the logs for the database
logs-db:
	docker-compose -f docker-compose.dev.yml logs -f db

# Remove the database container and its data
clean-db:
	docker-compose -f docker-compose.dev.yml down -v
