function write(level, message, context = {}) {
  const payload = { timestamp: new Date().toISOString(), level, message, ...context };
  const output = JSON.stringify(payload, (_, value) => value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value);
  console[level === 'error' ? 'error' : 'log'](output);
}

export const logger = Object.freeze({
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
});
