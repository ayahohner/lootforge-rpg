import {
  autoSellInferiorItems,
  calculateRunScore,
  calculateTotalLootValue,
  collectTreasure,
  consumePotion,
  createNewGame,
  attackEnemy,
  discardItem,
  equipItem,
  hasAliveEnemies,
  progressToNextRoom,
  restInRoom,
  upgradeItem,
} from './src/game.js'
import { createAutoRunController } from './src/application/autoRunController.js'
import {
  clearSavedState,
  loadHighScore,
  loadSavedState,
  saveGameState,
  saveHighScore,
} from './src/infrastructure/persistence.js'
import { getUiElements, renderAll, renderGameOver } from './src/adapters/ui/renderer.js'

const DEFAULT_HERO_NAME = 'Ashen'
const LOW_HP_RATIO = 0.33

const ui = getUiElements()
let state = loadSavedState() || createNewGame(Math.floor(Math.random() * 100000000), DEFAULT_HERO_NAME)
let highScore = loadHighScore()

const autoRunController = createAutoRunController({
  getState: () => state,
  onTick: () => {
    performAutoAction()
    renderAndPersist()
  },
})

ui.seedInput.value = String(state.seed)
ui.autoModeToggle.checked = state.autoMode

function isLowHealth() {
  return state.hero.hp <= Math.ceil(state.hero.maxHp * LOW_HP_RATIO)
}

function collectAvailableLoot() {
  if (state.currentRoom.goldBonus > 0 || state.currentRoom.chest.length > 0) {
    collectTreasure(state)
    return true
  }
  return false
}

function performAutoAction() {
  const room = state.currentRoom
  if (!room || !state.hero.alive) {
    return
  }

  if (state.potions > 0 && isLowHealth()) {
    consumePotion(state)
    return
  }

  if (room.type === 'combat' && hasAliveEnemies(state)) {
    const target = room.enemies.findIndex((enemy) => enemy.hp > 0)
    if (target >= 0) {
      attackEnemy(state, target)
      return
    }
  }

  if (collectAvailableLoot()) {
    return
  }

  if (room.type === 'rest' && state.hero.hp < state.hero.maxHp) {
    restInRoom(state)
    return
  }

  if (room.type === 'combat' && hasAliveEnemies(state)) {
    return
  }

  progressToNextRoom(state)
}

const rendererCallbacks = {
  onAttackEnemy(index) {
    attackEnemy(state, index)
    if (!state.hero.alive) {
      state.log.push('You collapse. Start a new run to continue your exploration.')
    }
    renderAndPersist()
    syncAutoMode()
  },
  onEquipItem(itemId) {
    equipItem(state, itemId)
    renderAndPersist()
    syncAutoMode()
  },
  onDiscardItem(itemId) {
    discardItem(state, itemId)
    renderAndPersist()
    syncAutoMode()
  },
  onUpgradeItem(itemId) {
    upgradeItem(state, itemId)
    renderAndPersist()
    syncAutoMode()
  },
}

function syncAutoMode() {
  state.autoMode = ui.autoModeToggle.checked
  if (state.autoMode) {
    autoRunController.sync()
  } else {
    autoRunController.stop()
  }
  saveGameState(state)
}

function pauseAutoLoopForManualAction() {
  autoRunController.pause()
}

function ignoreAutoTickForInput(event) {
  if (event.target instanceof Element && event.target.closest('button')) {
    pauseAutoLoopForManualAction()
  }
}

document.addEventListener('pointerdown', ignoreAutoTickForInput, { passive: true })
document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.closest('button')) {
    pauseAutoLoopForManualAction()
  }
})

function renderGameOverState() {
  if (state.hero.alive) {
    renderGameOver(state, ui, {
      runScore: 0,
      highScore: 0,
      lootValue: 0,
    })
    return
  }

  const score = calculateRunScore(state)
  if (score > highScore) {
    highScore = score
    saveHighScore(highScore)
  }

  renderGameOver(state, ui, {
    runScore: score,
    highScore,
    lootValue: calculateTotalLootValue(state),
  })
  autoRunController.stop()
}

function renderAndPersist() {
  renderAll(state, ui, rendererCallbacks)
  renderGameOverState()
  saveGameState(state)
}

ui.attackButton.onclick = () => {
  if (!state.currentRoom.enemies.length) {
    return
  }
  const targetIndex = state.currentRoom.enemies.findIndex((enemy) => enemy.hp > 0)
  if (targetIndex < 0) {
    state.log.push('No living targets remain.')
    renderAndPersist()
    return
  }
  attackEnemy(state, targetIndex)
  renderAndPersist()
  syncAutoMode()
}

ui.collectButton.onclick = () => {
  collectTreasure(state)
  renderAndPersist()
  syncAutoMode()
}

ui.progressButton.onclick = () => {
  progressToNextRoom(state)
  renderAndPersist()
  syncAutoMode()
}

ui.potionButton.onclick = () => {
  consumePotion(state)
  renderAndPersist()
  syncAutoMode()
}

ui.restButton.onclick = () => {
  restInRoom(state)
  renderAndPersist()
  syncAutoMode()
}

ui.newRunBtn.onclick = () => {
  autoRunController.stop()
  const userSeed = Number(ui.seedInput.value) || Date.now()
  state = createNewGame(userSeed, DEFAULT_HERO_NAME)
  state.autoMode = ui.autoModeToggle.checked
  clearSavedState()
  saveGameState(state)
  renderAndPersist()
  syncAutoMode()
}

ui.autoModeToggle.onchange = () => {
  syncAutoMode()
}

ui.autoSellButton.onclick = () => {
  autoSellInferiorItems(state)
  renderAndPersist()
  syncAutoMode()
}

ui.playAgainButton.onclick = () => {
  const userSeed = Number(ui.seedInput.value) || Date.now()
  state = createNewGame(userSeed, DEFAULT_HERO_NAME)
  state.autoMode = ui.autoModeToggle.checked
  clearSavedState()
  saveGameState(state)
  ui.gameOverModal.classList.add('hidden')
  renderAndPersist()
  syncAutoMode()
}

renderAndPersist()
syncAutoMode()

