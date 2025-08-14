const { logger } = require('../logger');
/**
 * Invalidate Redis cache for a single entity and its collection listing.
 *
 * Supports both node‑redis v4 and ioredis clients, with fallbacks.
 *
 * @param {object} redisClient    An instance of node‑redis or ioredis
 * @param {string} keyPrefix      The singular prefix, e.g. 'category'
 * @param {string|null} id        Optional ID to remove the single‑entity key
 * @param {object}   [options={}]
 * @param {number}   [options.scanCount=100]    How many keys per SCAN batch
 * @param {object}   [options.logger=console]   Logger for info/error
 */
async function invalidateCache(
  redisClient,
  keyPrefix,
  id = null,
  options = {}
) {
  const { scanCount = 100 } = options;
  const singleKey = id ? `${keyPrefix}:${id}` : null;
  const listPattern = `{${keyPrefix},${keyPrefix}s}:*`;

  // Detect pipeline/multi
  const hasMulti = typeof redisClient.multi === 'function';
  const hasPipeline = typeof redisClient.pipeline === 'function';
  const usePipeline = hasMulti
    ? redisClient.multi()
    : hasPipeline
    ? redisClient.pipeline()
    : null;

  try {
    // Remove the single‑entity key immediately or queue it
    if (singleKey) {
      if (usePipeline) {
        usePipeline.del(singleKey);
      } else {
        await redisClient.del(singleKey);
      }
    }

    // Walk matching keys and queue or delete
    if (typeof redisClient.scanIterator === 'function') {
      // node‑redis v4
      for await (const key of redisClient.scanIterator({
        MATCH: listPattern,
        COUNT: scanCount,
      })) {
        usePipeline ? usePipeline.unlink(key) : await redisClient.unlink(key);
      }
    } else if (typeof redisClient.scanStream === 'function') {
      // ioredis
      await new Promise((resolve, reject) => {
        const stream = redisClient.scanStream({
          match: listPattern,
          count: scanCount,
        });
        stream.on('data', (keys = []) => {
          keys.forEach((key) => {
            if (usePipeline) {
              usePipeline.del(key);
            } else {
              // fire & forget
              redisClient
                .del(key)
                .catch((e) => logger.error('Error deleting key', key, e));
            }
          });
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    } else if (typeof redisClient.scan === 'function') {
      // Generic fallback (node‑redis <4)
      let cursor = '0';
      do {
        const reply = await redisClient.scan(
          cursor,
          'MATCH',
          listPattern,
          'COUNT',
          scanCount
        );
        cursor = reply[0];
        const keys = reply[1];
        if (keys.length) {
          if (usePipeline) {
            keys.forEach((k) => usePipeline.del(k));
          } else {
            await Promise.all(keys.map((k) => redisClient.del(k)));
          }
        }
      } while (cursor !== '0');
    } else {
      logger.warn(
        'invalidateCache: Redis client has no SCAN support, skipping list keys'
      );
    }

    // 3️⃣ Execute pipeline if we queued commands
    if (usePipeline) {
      await usePipeline.exec();
    }

    logger.info(
      `Cache invalidated for prefix="${keyPrefix}"${id ? `, id=${id}` : ''}`
    );
  } catch (err) {
    logger.error(
      `Failed to invalidate cache for prefix="${keyPrefix}"${
        id ? `, id=${id}` : ''
      }:`,
      err
    );
    // swallow error so your main flow doesn’t break
  }
}

module.exports = { invalidateCache };
