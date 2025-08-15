# E-Services - Audit Log Service

The primary responsibility of this microservice is log certain api activities.

## Getting Started

1. Ensure you have Node.js installed.
2. Create necessary .env files for each microservice. Note: a template of required environment variables will be made available.
3. 3. In terminal, execute the following commands:
   - `npm install`

## Running the Project

1. In the terminal: `npm run watch`
2. Browse the health status at `localhost:8014/health`
3. Refer to api documentation using either of the following endpoints:
   - `http://localhost:8014/docs/redoc`
   - `http://localhost:8014/docs/swagger`

## Documentation

### Creating Documentation

1. In the root execute the following commands:
   1. `npm run build:redoc:v1`
   2. `npm run bundle:openapi:v1`
   3. OR `npm run dev:docs` will execute all the above commands at once.
2. Access api documentation as described below

### Accessing Documentation

- ##### OpenAPI documentation rendered in ReDoc

  `http://localhost:8001/docs/redoc`

- ##### Documentation rendered in Swagger UI

  `http://localhost:8001/docs/swagger`

### Example docs that can be stored

#### HTTP inbound (login failed):

```
{
  "service": "identity-service",
  "action": "auth.login.failure",
  "actor": { "type": "user", "id": "66b..." },
  "resource": { "type": "session" },
  "channel": "http",
  "direction": "inbound",
  "status": "failure",
  "statusCode": 401,
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0",
  "requestId": "req_abc",
  "latencyMs": 64,
  "http": { "method": "POST", "path": "/v1/auth/login", "statusCode": 401 },
  "requestSummary": { "bytes": 142, "fields": ["username"] },
  "meta": { "reason": "invalid_credentials" }
}
```

#### Notification sent (verify email)

```
{
  "service": "notification-service",
  "action": "notif.email.sent",
  "actor": { "type": "service", "id": "notification-service" },
  "resource": { "type": "email", "id": "msg_792" },
  "channel": "email",
  "direction": "outbound",
  "status": "success",
  "latencyMs": 120,
  "requestId": "req_def",
  "notif": {
    "channel": "email",
    "provider": "ses",
    "templateId": "verify-email",
    "target": { "emailHash": "sha256:..." },
    "messageId": "ses:12345"
  }
}
```

#### MQ consume (DLQ move):

```
{
  "service": "order-service",
  "action": "mq.dlq.move",
  "channel": "mq",
  "direction": "internal",
  "status": "success",
  "mq": {
    "system": "kafka",
    "topic": "orders.events",
    "partition": 2,
    "messageId": "kafka:0-123456",
    "retryCount": 5,
    "dlq": true
  },
  "correlationId": "corr_xyz",
  "latencyMs": 8
}
```

#### Log a queue publish

```
await createAuditLog({
  service: 'order-service',
  action: 'mq.publish',
  channel: 'mq',
  direction: 'internal',
  mq: { system: 'kafka', topic: 'orders.events', messageId: msgId },
  correlationId: corrId,
});

```

## CI/CD

## Running the Tests
