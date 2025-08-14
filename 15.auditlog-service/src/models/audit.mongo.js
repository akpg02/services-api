const mongoose = require('mongoose');
const { Schema } = mongoose;

// HTTP (gateway/service calls, webhooks received)
const HttpInfoSchema = new Schema(
  {
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    path: { type: String },
    statusCode: { type: Number, min: 100, max: 599 },
    requestSize: { type: Number, min: 0 },
    responseSize: { type: Number, min: 0 },
  },
  { _id: false }
);

// MQ / event bus (publish/consume)
const MqInfoSchema = new Schema(
  {
    system: { type: String },
    topic: { type: String },
    queue: { type: String },
    routingKey: { type: String },
    partition: { type: Number },
    messageId: { type: String },
    retryCount: { type: Number, min: 0 },
    dlq: { type: Boolean, default: false },
  },
  { _id: false }
);

// Outbound notifications (email/SMS/push)
const NotifInfoSchema = new Schema(
  {
    channel: { type: String, enum: ['email', 'sms', 'push'] },
    provider: { type: String },
    templateId: { type: String },
    target: {
      emailHash: { type: String },
      phoneHash: { type: String },
      userId: { type: String },
    },
    messageId: { type: String },
  },
  { _id: false }
);

// Webhooks (outbound to partners or inbound from partners)
const WebhookInfoSchema = new Schema(
  {
    url: { type: String },
    event: { type: String },
    deliveryId: { type: String },
    signatureHash: { type: String },
    statusCode: { type: Number, min: 100, max: 599 },
    latencyMs: { type: Number, min: 0 },
  },
  { _id: false }
);

const auditLogSchema = new Schema(
  {
    service: {
      type: String,
      required: [true, 'Service name is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
    },
    actor: {
      type: {
        type: String,
        enum: ['user', 'service'],
        default: 'service',
      },
      id: { type: String }, // can hold ObjectId as string or external id
    },
    resource: {
      type: { type: String }, // e.g. user | order | email | webhook
      id: { type: String },
    },
    channel: {
      type: String,
      enum: ['http', 'mq', 'email', 'sms', 'push', 'webhook', 'job', 'main'],
      required: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'interal0'],
    },
    // Correlation / tracing
    requestId: { type: String }, // per-request id (gateway)
    correlationId: { type: String }, // cross-service trace id

    // Outcome
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    statusCode: { type: Number }, // HTTP status or provider code
    reason: { type: String }, // failure reason (short)

    // Timing & client
    latencyMs: { type: Number, min: 0 },
    ip: { type: String },
    userAgent: { type: String },

    // Channel-specific details (only fill the one that applies)
    http: { type: HttpInfoSchema },
    mq: { type: MqInfoSchema },
    notif: { type: NotifInfoSchema },
    webhook: { type: WebhookInfoSchema },

    // Safe summaries of payloads (sizes/hashes; avoid raw bodies)
    requestSummary: {
      type: new Schema(
        {
          bytes: { type: Number, min: 0 },
          hash: { type: String }, // sha256 of redacted body, if you compute it
          fields: { type: [String], default: [] }, // names of non-sensitive fields captured
        },
        { _id: false }
      ),
      default: undefined,
    },

    responseSummary: {
      type: new Schema(
        {
          bytes: { type: Number, min: 0 },
          hash: { type: String },
          fields: { type: [String], default: [] },
        },
        { _id: false }
      ),
      default: undefined,
    },

    // Free-form safe metadata (keep it small and redacted in code)
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true, // <-- fix 'timestaps' typo
    minimize: true,
    strict: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Require certain subfields based on channel
auditLogSchema.pre('validate', function (next) {
  try {
    if (this.channel === 'http') {
      if (!this.http?.method || !this.http?.path) {
        return next(
          new Error('http.method and http.path are required for channel=http')
        );
      }
    }
    if (this.channel === 'webhook') {
      if (!this.webhook?.url) {
        return next(new Error('webhook.url is required for channel=webhook'));
      }
    }
    if (['email', 'sms', 'push'].includes(this.channel)) {
      if (!this.notif?.provider || !this.notif?.channel) {
        return next(
          new Error(
            'notif.provider and notif.channel are required for notifications'
          )
        );
      }
    }
    if (this.channel === 'mq') {
      if (!this.mq?.topic && !this.mq?.queue) {
        return next(
          new Error('mq.topic or mq.queue is required for channel=mq')
        );
      }
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ service: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ channel: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1 });
auditLogSchema.index({ correlationId: 1 });
// Example combo for queries by user and timeframe
auditLogSchema.index({ 'actor.id': 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
