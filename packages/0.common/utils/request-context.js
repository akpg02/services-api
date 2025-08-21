const { AsyncLocalStorage } = require('node:async_hooks');
const als = new AsyncLocalStorage();

function runWithContext(ctx, fn) {
  return als.run(ctx, fn);
}

function getContext() {
  return als.getStore() || null;
}

module.exports = { runWithContext, getContext };
