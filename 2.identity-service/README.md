# E-Services - Indentity Service

The primary responsibility of this microservice is managing user authentication and authorization.

## Getting Started

1. Ensure you have Node.js installed.
2. Create necessary .env files for each microservice. Note: a template of required environment variables will be made available.
3. 3. In terminal, execute the following commands:
   - `npm install`

## Running the Project

1. In the terminal: `npm run watch`
2. Browse the health status at `localhost:8001/health`
3. Refer to api documentation using either of the following endpoints:
   - `http://localhost:8001/docs/redoc`
   - `http://localhost:8001/docs/swagger`

## Documentation

### Creating Documentation

1. In the root execute the following commands:
   1. `npm run build:redoc:v1`
   2. `npm run bundle:openapi:v1`
   3. OR `npm run dev:docs` will execute all the above commands at once.
2. Access api documentation as described below

### Accessing Documentation

##### OpenAPI documentation rendered in ReDoc

`http://localhost:8001/docs/redoc`

##### Documentation rendered in Swagger UI

`http://localhost:8001/docs/swagger`

## CI/CD

## Running the Tests
