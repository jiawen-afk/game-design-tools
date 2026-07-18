function registerAwaitedVideoProcessingShutdown(app, videoProcessing) {
  let shutdownStarted = false
  let readyToQuit = false

  app.on('before-quit', (event) => {
    if (readyToQuit) return
    event.preventDefault()
    if (shutdownStarted) return
    shutdownStarted = true
    Promise.resolve()
      .then(() => videoProcessing.shutdown())
      .catch(() => {})
      .finally(() => {
        readyToQuit = true
        app.quit()
      })
  })
}

module.exports = { registerAwaitedVideoProcessingShutdown }
