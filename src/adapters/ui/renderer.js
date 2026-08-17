export function getUiElements() {
  return {
    seedInput: document.getElementById('seedInput'),
    newRunBtn: document.getElementById('newRun'),
    attackButton: document.getElementById('attackButton'),
    collectButton: document.getElementById('collectButton'),
    progressButton: document.getElementById('progressButton'),
    potionButton: document.getElementById('potionButton'),
    restButton: document.getElementById('restButton'),
    heroCards: document.getElementById('heroCards'),
    resources: document.getElementById('resources'),
    roomTitle: document.getElementById('roomTitle'),
    roomMessage: document.getElementById('roomMessage'),
    enemyList: document.getElementById('enemyList'),
    equipped: document.getElementById('equipped'),
    inventory: document.getElementById('inventory'),
    logList: document.getElementById('log'),
    autoModeToggle: document.getElementById('autoMode'),
    autoSellButton: document.getElementById('autoSellButton'),
    gameOverModal: document.getElementById('gameOverModal'),
    deathRoomLabel: document.getElementById('deathRoom'),
    runScoreLabel: document.getElementById('runScore'),
    highScoreLabel: document.getElementById('highScore'),
    lootValueLabel: document.getElementById('lootValue'),
    playAgainButton: document.getElementById('playAgainButton'),
  }
}

const DEFAULT_RARITY_COLOR = '#d8dee7'

function applyStat(item) {
  const parts = []
  Object.entries(item.stats).forEach(([stat, value]) => {
    parts.push(`+${value} ${stat.toUpperCase()}`)
  })
  return parts.join(' ')
}

function itemTitle(item) {
  const color = item.rarity?.color || DEFAULT_RARITY_COLOR
  const sprite = item.sprite || '📦'
  return `<span class="item-sprite">${sprite}</span><span class="rarity-pill" style="color:${color}; border-color:${color}">${item.rarity?.name || 'Common'}</span> ${item.name} Lv ${item.level}`
}

function itemDetail(item) {
  return `${applyStat(item)}`
}

function applyRarityColor(card, item) {
  const color = item.rarity?.color || DEFAULT_RARITY_COLOR
  card.style.borderLeft = `4px solid ${color}`
}

function renderHero(state, ui) {
  const hero = state.hero
  ui.heroCards.innerHTML = `<div class="hero-card">
    <strong>${hero.name}</strong>
    <span>Lv ${hero.level} (${hero.xp}/${hero.xpToNext} XP)</span>
    <div class="hero-stats">
      <div class="hero-stat">
        <span class="hero-stat__label">Depth</span>
        <span class="hero-stat__value">${state.depth}</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__label">Turn</span>
        <span class="hero-stat__value">${state.turn}</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__label">Atk</span>
        <span class="hero-stat__value">${hero.attack}</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__label">Def</span>
        <span class="hero-stat__value">${hero.defense}</span>
      </div>
      <div class="hero-stat">
        <span class="hero-stat__label">Luck</span>
        <span class="hero-stat__value">${hero.luck}</span>
      </div>
    </div>
  </div>`

  const hpWidth = Math.max(5, (hero.hp / hero.maxHp) * 100)
  ui.resources.innerHTML = `<ul class="stats-list">
    <li><span class="k">HP</span> <span>${hero.hp}/${hero.maxHp}</span></li>
    <li><span class="k">Gold</span> <span>${state.gold}</span></li>
    <li><span class="k">Potions</span> <span>${state.potions}</span></li>
  </ul>
    <div class="bar"><span style="width:${hpWidth}%"></span></div>
  <div class="muted" style="margin-top: .3rem;">Health and resources</div>`
}

function renderActions(state, ui) {
  const canAttack = state.currentRoom.type === 'combat' && state.currentRoom.enemies.some((enemy) => enemy.hp > 0) && state.hero.alive
  ui.attackButton.disabled = !canAttack
  ui.collectButton.disabled = state.currentRoom.chest.length === 0 && !state.currentRoom.goldBonus
  ui.progressButton.disabled = state.currentRoom.type === 'combat' && state.currentRoom.enemies.some((enemy) => enemy.hp > 0)
  ui.potionButton.disabled = state.potions <= 0 || !state.hero.alive || state.hero.hp === state.hero.maxHp
  ui.restButton.disabled = state.currentRoom.type !== 'rest' || !state.hero.alive

  if (!state.hero.alive) {
    ui.attackButton.disabled = true
    ui.progressButton.disabled = true
    ui.collectButton.disabled = true
    ui.restButton.disabled = true
    ui.potionButton.disabled = true
  }
  ui.autoSellButton.disabled = state.inventory.length === 0
}

function renderRoom(state, ui, handlers) {
  const room = state.currentRoom
  ui.roomTitle.textContent = `${room.type.toUpperCase()} | ${room.id}`
  ui.roomMessage.textContent = room.message

  if (room.enemies.length === 0) {
    ui.enemyList.innerHTML = `<p class="muted">No active monsters in this room.</p>`
    return
  }

  ui.enemyList.innerHTML = ''
  room.enemies.forEach((enemy, index) => {
    const healthPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100)
    const row = document.createElement('div')
    row.className = `enemy ${enemy.hp <= 0 ? 'dead' : ''}`
    row.innerHTML = `
      <div class="enemy-main">
        <strong class="enemy-title">${enemy.name}</strong>
        <div class="bar"><span style="width:${healthPercent}%;"></span></div>
        <div class="enemy-meta">
          <span>HP ${Math.max(0, enemy.hp)} / ${enemy.maxHp}</span>
          <span>ATK ${enemy.attack}</span>
          <span>DEF ${enemy.defense}</span>
        </div>
      </div>
    `
    const button = document.createElement('button')
    button.textContent = enemy.hp > 0 ? 'Attack' : 'Defeated'
    button.disabled = enemy.hp <= 0 || room.type !== 'combat' || !state.hero.alive
    button.classList.add('mini-btn')
    button.onclick = () => handlers.onAttackEnemy(index)
    row.appendChild(button)
    ui.enemyList.appendChild(row)
  })
}

function renderLoadout(item, canUpgrade, callbacks) {
  const card = document.createElement('div')
  card.className = 'item'
  applyRarityColor(card, item)
  card.innerHTML = `<h3>${itemTitle(item)}</h3><p>${itemDetail(item)}</p>`

  const itemActions = document.createElement('div')
  itemActions.className = 'item-actions'

  if (canUpgrade) {
    const upgradeCost = Math.round(50 * (item.level + 1) * (1 + item.rarity.level * 0.45))
    const btn = document.createElement('button')
    btn.textContent = `Upgrade (${upgradeCost}g)`
    btn.className = 'mini-btn'
    btn.onclick = () => callbacks.onUpgradeItem(item.id)
    itemActions.appendChild(btn)
  }

  if (itemActions.children.length > 0) {
    card.appendChild(itemActions)
  }
  return card
}

function renderEquipment(state, ui, callbacks) {
  const slots = [
    ['weapon', 'Weapon'],
    ['armor', 'Armor'],
    ['amulet', 'Amulet'],
  ]

  ui.equipped.innerHTML = ''
  slots.forEach(([slot, label]) => {
    const item = state.equipped[slot]
    const wrapper = document.createElement('div')
    wrapper.className = 'slot'
    wrapper.innerHTML = `<h4>${label}</h4>`

    if (item) {
      const card = renderLoadout(item, true, callbacks)
      wrapper.appendChild(card)
    } else {
      wrapper.innerHTML += '<p>Empty</p>'
    }
    ui.equipped.appendChild(wrapper)
  })
}

function renderInventory(state, ui, callbacks) {
  ui.inventory.innerHTML = ''
  if (state.inventory.length === 0) {
    ui.inventory.innerHTML = '<p>Inventory is empty.</p>'
    return
  }

  state.inventory.forEach((item) => {
    const card = renderLoadout(item, false, callbacks)
    card.className = 'item'

    const equipBtn = document.createElement('button')
    equipBtn.textContent = `Equip ${item.slot}`
    equipBtn.className = 'mini-btn'
    equipBtn.onclick = () => callbacks.onEquipItem(item.id)

    const discardBtn = document.createElement('button')
    discardBtn.textContent = 'Discard'
    discardBtn.className = 'danger'
    discardBtn.classList.add('mini-btn')
    discardBtn.onclick = () => callbacks.onDiscardItem(item.id)

    const itemActions = document.createElement('div')
    itemActions.className = 'item-actions'
    itemActions.appendChild(equipBtn)
    itemActions.appendChild(discardBtn)
    card.appendChild(itemActions)
    ui.inventory.appendChild(card)
  })
}

function renderLog(state, ui) {
  ui.logList.innerHTML = ''
  state.log
    .slice(-16)
    .reverse()
    .forEach((entry) => {
      const item = document.createElement('li')
      item.textContent = entry
      ui.logList.appendChild(item)
    })
}

export function renderAll(state, ui, callbacks = {}) {
  const safeCallbacks = {
    onAttackEnemy: () => {},
    onEquipItem: () => {},
    onDiscardItem: () => {},
    onUpgradeItem: () => {},
    ...callbacks,
  }

  renderHero(state, ui)
  renderRoom(state, ui, safeCallbacks)
  renderActions(state, ui)
  renderEquipment(state, ui, safeCallbacks)
  renderInventory(state, ui, safeCallbacks)
  renderLog(state, ui)
}

export function renderGameOver(state, ui, gameStats = {}) {
  if (state.hero.alive) {
    ui.gameOverModal.classList.add('hidden')
    return
  }

  const runScore = gameStats.runScore ?? 0
  const highScore = gameStats.highScore ?? 0
  const lootValue = gameStats.lootValue ?? 0
  ui.deathRoomLabel.textContent = state.currentRoom?.id || 'an unknown location'
  ui.runScoreLabel.textContent = String(runScore)
  ui.highScoreLabel.textContent = String(highScore)
  ui.lootValueLabel.textContent = String(lootValue)
  ui.gameOverModal.classList.remove('hidden')
}
