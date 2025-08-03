const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

let connection = null;
let channel = null;

// -- Core connection logic --
async function connectToRabbitMQ() {
  if (channel) return channel;
  connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // ensure your exchange exists
  await channel.assertExchange(
    process.env.EXCHANGE_NAME,
    process.env.EXCHANGE_TYPE || 'topic',
    { durable: true }
  );

  connection.on('error', (err) => {
    logger.error('RabbitMQ connection error:', err);
    connection = channel = null;
  });
  connection.on('close', () => {
    logger.warn('RabbitMQ connection closed');
    connection = channel = null;
  });

  logger.info('Connected to RabbitMQ and exchange asserted.');
  return channel;
}

function getConnection() {
  return connection;
}
function getChannel() {
  return channel;
}

// -- Pub / Sub methods --
async function publishEvent(routingKey, message, options = {}) {
  const ch = channel || (await connectToRabbitMQ());
  const payload = Buffer.from(JSON.stringify(message));
  const ok = ch.publish(process.env.EXCHANGE_NAME, routingKey, payload, {
    persistent: true,
    ...options,
  });
  logger[ok ? 'info' : 'warn'](
    `Event ${ok ? 'published' : 'dropped'}: ${routingKey}`
  );
  return ok;
}

async function consumeEvent(routingKey, callback, queueOptions = {}) {
  const ch = channel || (await connectToRabbitMQ());
  // use a server-generated queue name
  const { queue } = await ch.assertQueue('', {
    exclusive: true,
    ...queueOptions,
  });
  await ch.bindQueue(queue, process.env.EXCHANGE_NAME, routingKey);

  ch.consume(
    queue,
    (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        callback(data);
        ch.ack(msg);
      } catch (err) {
        logger.error('Error processing message:', err);
        ch.nack(msg, false, false);
      }
    },
    { noAck: false }
  );

  logger.info(`Subscribed to ${routingKey}`);
}

// -- RPC client -->
async function sendRPCRequest(queueName, payload, timeout = 20_000) {
  const ch = channel || (await connectToRabbitMQ());
  const correlationId = uuidv4();
  const { queue: replyTo } = await ch.assertQueue('', { exclusive: true });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('RPC Request Timeout')),
      timeout
    );

    // listen for the reply
    ch.consume(
      replyTo,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          clearTimeout(timer);
          resolve(JSON.parse(msg.content.toString()));
        }
      },
      { noAck: true }
    );

    // send the request
    ch.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
      correlationId,
      replyTo,
    });
  });
}

// -- RPC server -->
async function registerRPCHandler(queueName, handlerFn) {
  const ch = channel || (await connectToRabbitMQ());
  await ch.assertQueue(queueName, { durable: false });

  ch.consume(queueName, async (msg) => {
    if (!msg) return;
    let result;
    try {
      const request = JSON.parse(msg.content.toString());
      result = await handlerFn(request);
    } catch (err) {
      logger.error('RPC handler error:', err);
      result = { error: err.message };
    }

    ch.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(result)),
      { correlationId: msg.properties.correlationId }
    );
    ch.ack(msg);
  });

  logger.info(`RPC handler registered on queue "${queueName}"`);
}

module.exports = {
  // connection
  connectToRabbitMQ,
  getConnection,
  getChannel,
  // pub/sub
  publishEvent,
  consumeEvent,
  // rpc
  sendRPCRequest,
  registerRPCHandler,
};
