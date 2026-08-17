import { createNewGame, createSeededRng } from '../game.js'

const SAVE_KEY = 'lootforge-game-save'
const HIGH_SCORE_KEY = 'lootforge-high-score'
const SAVE_SCHEMA = 2

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function clampNumber(value, fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(number)))
}

function clampFloat(value, fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return fallback
  }
  return Math.max(min, Math.min(max, number))
}

function sanitizeList(value) {
  return Array.isArray(value) ? value : []
}

function createDefaultRarity() {
  return { name: 'Common', level: 0, multiplier: 1, color: '#d8dee7' }
}

function sanitizeItem(item) {
  if (!isObject(item)) {
    return null
  }

  const rarity = isObject(item.rarity) ? item.rarity : createDefaultRarity()
  return {
    id: typeof item.id === 'string' ? item.id : `item-${Math.floor(Math.random() * 1_000_000_000)}`,
    slot: typeof item.slot === 'string' ? item.slot : 'weapon',
    rarity: {
      name: typeof rarity.name === 'string' ? rarity.name : createDefaultRarity().name,
      level: clampNumber(rarity.level, 0, 0),
      multiplier: clampFloat(rarity.multiplier, 1, 0.25),
      color: typeof rarity.color === 'string' ? rarity.color : createDefaultRarity().color,
    },
    sprite: typeof item.sprite === 'string' ? item.sprite : '📦',
    level: clampNumber(item.level, 1, 1),
    name: typeof item.name === 'string' ? item.name : 'Unknown Relic',
    stats: isObject(item.stats) ? item.stats : {},
  }
}
function sanitizeHero(hero) {
  const fallback = {
    name: 'Ashen',
    level: 1,
    xp: 0,
    xpToNext: 45,
    hp: 110,
    maxHp: 110,
    attack: 13,
    defense: 4,
    luck: 2,
    alive: true,
  }
  if (!isObject(hero)) {
    return fallback
  }

  return {
    name: typeof hero.name === 'string' ? hero.name : fallback.name,
    level: clampNumber(hero.level, fallback.level, 1),
    xp: clampNumber(hero.xp, fallback.xp, 0),
    xpToNext: clampNumber(hero.xpToNext, fallback.xpToNext, 1),
    hp: clampNumber(hero.hp, fallback.hp, 0),
    maxHp: clampNumber(hero.maxHp, fallback.maxHp, 1),
    attack: clampNumber(hero.attack, fallback.attack, 0),
    defense: clampNumber(hero.defense, fallback.defense, 0),
    luck: clampNumber(hero.luck, fallback.luck, 0),
    alive: !!hero.alive,
  }
}

function sanitizeEnemy(enemy) {
  if (!isObject(enemy)) {
    return null
  }
  return {
    id: typeof enemy.id === 'string' ? enemy.id : `enemy-${Date.now()}`,
    name: typeof enemy.name === 'string' ? enemy.name : 'Unknown Threat',
    hp: clampNumber(enemy.hp, 1, 0),
    maxHp: clampNumber(enemy.maxHp, 1, 1),
    attack: clampNumber(enemy.attack, 1, 0),
    defense: clampNumber(enemy.defense, 0, 0),
    reward: isObject(enemy.reward)
      ? {
          gold: clampNumber(enemy.reward.gold, 0, 0),
          xp: clampNumber(enemy.reward.xp, 0, 0),
          lootChance: clampNumber(enemy.reward.lootChance, 0, 0, 100),
        }
      : { gold: 0, xp: 0, lootChance: 0 },
  }
}

function sanitizeRoom(room, seed) {
  if (!isObject(room)) {
    return {
      id: `room-0`,
      depth: 1,
      biome: 'Forsaken Hollow',
      type: 'combat',
      discovered: true,
      cleared: false,
      enemies: [],
      chest: [],
      goldBonus: 0,
      message: 'Continue your expedition.',
    }
  }

  return {
    id: typeof room.id === 'string' ? room.id : `room-${seed}`,
    depth: clampNumber(room.depth, 1, 1),
    biome: typeof room.biome === 'string' ? room.biome : 'Forsaken Hollow',
    type: typeof room.type === 'string' ? room.type : 'combat',
    discovered: Boolean(room.discovered),
    cleared: Boolean(room.cleared),
    enemies: sanitizeList(room.enemies).map((enemy) => sanitizeEnemy(enemy)).filter(Boolean),
    chest: sanitizeList(room.chest).map((item) => sanitizeItem(item)).filter(Boolean),
    goldBonus: clampNumber(room.goldBonus, 0, 0),
    message: typeof room.message === 'string' ? room.message : '',
  }
}

function sanitizeStateFromStorage(savedState) {
  const baseSeed = clampNumber(savedState.seed, Date.now(), 1)
  const stateSeed = baseSeed > 0 ? baseSeed : Date.now()
  const fallback = createNewGame(stateSeed, 'Ashen')
  const restored = {
    seed: stateSeed,
    turn: clampNumber(savedState.turn, 0, 0),
    roomIndex: clampNumber(savedState.roomIndex, 0, 0),
    depth: clampNumber(savedState.depth, 1, 1),
    hero: sanitizeHero(savedState.hero),
    gold: clampNumber(savedState.gold, 120, 0),
    potions: clampNumber(savedState.potions, 3, 0),
    equipped: {
      weapon: sanitizeItem(savedState.equipped?.weapon) || fallback.equipped.weapon,
      armor: sanitizeItem(savedState.equipped?.armor) || fallback.equipped.armor,
      amulet: savedState.equipped?.amulet ? sanitizeItem(savedState.equipped.amulet) : fallback.equipped.amulet,
    },
    autoMode: Boolean(savedState.autoMode),
    inventory: sanitizeList(savedState.inventory).map((item) => sanitizeItem(item)).filter(Boolean),
    log: sanitizeList(savedState.log).map((entry) => String(entry)).slice(-180),
    currentRoom: sanitizeRoom(savedState.currentRoom, stateSeed),
    turnSeed: Date.now(),
  }
  restored.rng = createSeededRng(restored.seed)
  restored.rng.state = clampNumber(savedState.rngState, restored.rng.state, 1)
  return {
    ...fallback,
    ...restored,
    hero: { ...fallback.hero, ...restored.hero },
    currentRoom: { ...fallback.currentRoom, ...restored.currentRoom },
  }
}

function buildPersistState(state) {
  return {
    version: SAVE_SCHEMA,
    payload: {
      seed: state.seed,
      turn: state.turn,
      roomIndex: state.roomIndex,
      depth: state.depth,
      hero: state.hero,
      gold: state.gold,
      potions: state.potions,
      equipped: state.equipped,
      autoMode: state.autoMode,
      inventory: state.inventory,
      log: state.log.slice(-180),
      currentRoom: state.currentRoom,
      rngState: state.rng?.state,
    },
  }
}

export function saveGameState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildPersistState(state)))
  } catch {
    // ignore storage failures
  }
}

export function clearSavedState() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore storage failures
  }
}

export function loadSavedState() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!isObject(parsed) || !parsed.version || !parsed.payload) {
      return null
    }
    if (parsed.version > SAVE_SCHEMA || parsed.version < 1) {
      return null
    }
    return sanitizeStateFromStorage(parsed.payload)
  } catch {
    return null
  }
}

export function loadHighScore() {
  return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0)
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch {
    // ignore storage failures
  }
}
