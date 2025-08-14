async function invalidateIdentityCache(req, input) {
  const cachedKey = `user:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys('users:*');
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

module.exports = { invalidateIdentityCache };
