const AUTO_TICK_MS = 120
const AUTO_MANUAL_PAUSE_MS = 550

export function createAutoRunController({ getState, onTick }) {
  let autoTickId = null
  let autoInteractionPausedUntil = 0

  function clear() {
    if (!autoTickId) {
      return
    }
    clearTimeout(autoTickId)
    autoTickId = null
  }

  function tick() {
    const state = getState()
    if (!state || !state.autoMode || !state.hero?.alive) {
      autoTickId = null
      return
    }

    if (Date.now() < autoInteractionPausedUntil) {
      autoTickId = setTimeout(tick, AUTO_TICK_MS)
      return
    }

    onTick()
    autoTickId = setTimeout(tick, AUTO_TICK_MS)
  }

  function start() {
    const state = getState()
    if (autoTickId || !state?.autoMode || !state.hero?.alive) {
      return
    }
    tick()
  }

  function stop() {
    clear()
  }

  function sync() {
    const state = getState()
    if (state?.autoMode && state?.hero?.alive) {
      start()
    } else {
      stop()
    }
  }

  function pause(ms = AUTO_MANUAL_PAUSE_MS) {
    autoInteractionPausedUntil = Math.max(autoInteractionPausedUntil, Date.now() + ms)
  }

  function hasRunningLoop() {
    return Boolean(autoTickId)
  }

  return {
    start,
    stop,
    sync,
    pause,
    hasRunningLoop,
  }
}
