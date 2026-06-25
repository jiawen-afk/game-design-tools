function attachPostgresConnectionErrorSink(connection) {
  if (!connection || typeof connection.on !== 'function') return connection
  // pg can emit background error events after query promises have already rejected.
  connection.on('error', () => {})
  return connection
}

module.exports = {
  attachPostgresConnectionErrorSink,
}
