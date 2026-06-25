function attachPostgresConnectionErrorSink(connection) {
  const state = { error: null }
  if (!connection || typeof connection.on !== 'function') return state
  // pg can emit background error events after query promises have already rejected.
  connection.on('error', (error) => {
    state.error = error
  })
  return state
}

function throwIfPostgresConnectionErrored(state) {
  if (state?.error) throw state.error
}

module.exports = {
  attachPostgresConnectionErrorSink,
  throwIfPostgresConnectionErrored,
}
