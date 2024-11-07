# Install project dependencies
install:
	npm install

# Build the project
build:
	npm run build

# Run the application locally
dev:
	npm run dev

# Start the database in Docker
up-db:
	docker-compose up -d db

# Stop the database
down-db:
	docker-compose down

# run prisma studio
studio:
	npx prisma studio

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
	docker-compose logs -f db

# Remove the database container and its data
clean-db:
	docker-compose down -v
