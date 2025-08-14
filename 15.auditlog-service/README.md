## Example docs that can be stored

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
