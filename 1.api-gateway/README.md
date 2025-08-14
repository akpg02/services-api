### Creating Documentation

1. Changes to api endpoints definitions is only completed within each service.
2. Execute npm run {service} according to package.json within the api-gateway
3. In the gateway root execute the following commands:
   1. npm run combine:openapi
   2. npm run bundle:openapi
   3. npm run build:redoc
   4. OR just:
   5. npm run dev:docs
4. Acces api documentation as described below

### Access OpenAPI documentation rendered in ReDoc

`http://localhost:8000/docs/redoc`

### Access documentation rendered in Swagger UI

`http://localhost:8000/docs/swagger`
