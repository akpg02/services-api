# E-Services - API Gateway Service

The entry point to the overall api. Its main responsibility to manage user access tokens.

## Getting Started

1. Ensure you have Node.js installed.
2. Create necessary .env files for each microservice. Note: a template of required environment variables will be made available.
3. 3. In terminal, execute the following commands:
   - `npm install`

## Running the Project

1. In the terminal: `npm run watch`
2. Browse the gateway health status at `localhost:8000/health`
3. Refer to api documentation using either of the following endpoints:
   - `https://localhost:8000/docs/redoc`
   - `https://localhost:8000/docs/swagger`

## Documentation

### Creating Documentation

1. Changes to api endpoints definitions is only completed within each service.
2. Execute npm run {service} according to package.json within the api-gateway
   - For example: `npm run bundle:identity:v1`
   - Repeat with each microservice (Note: a command will be added to execute all commands at once)
3. In the gateway root execute the following commands:
   1. `npm run combine:openapi`
   2. `npm run bundle:openapi`
   3. `npm run build:redoc`
   4. OR `npm run dev:docs` will execute all the above commands at once.
4. Access api documentation as described below

### Accessing Documentation

##### OpenAPI documentation rendered in ReDoc

`https://localhost:8000/docs/redoc`

##### Documentation rendered in Swagger UI

`https://localhost:8000/docs/swagger`

## Running the Tests

## CI/CD
