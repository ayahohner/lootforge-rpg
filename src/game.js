const BIOMES = [
  "Ember Vale",
  "Cinder Ruins",
  "Mossreach",
  "Frostglass Caverns",
  "Broken Spires",
  "Stormfen",
  "Starfall Marsh",
]

const RARITY = [
  { name: "Common", level: 0, multiplier: 1, color: "#d8dee7" },
  { name: "Fine", level: 1, multiplier: 1.25, color: "#9de6a0" },
  { name: "Rare", level: 2, multiplier: 1.5, color: "#8fd3ff" },
  { name: "Epic", level: 3, multiplier: 1.8, color: "#d8abff" },
  { name: "Mythic", level: 4, multiplier: 2.05, color: "#ffb75b" },
]

const RARITY_WEIGHTS = [1, 0.48, 0.21, 0.09, 0.03]
const GAMMA = 0.58
const ITEM_STATS_GROWTH = {
  baseIntercept: 2.3,
  sqrtScale: 0.72,
  logScale: 1.0,
  depthBend: 1.5,
  secondaryChance: 0.22,
}
const ENEMY_CURVE = {
  hpLinear: 4.2,
  hpLog: 7.0,
  hpPow: 0.11,
  hpPowExp: 1.12,
  atkLog: 3.2,
  atkLinear: 0.62,
  defLinear: 0.34,
  defSqrt: 0.9,
  rewardGoldSlope: 1.4,
  rewardGoldLog: 4,
  rewardXpSlope: 0.88,
  rewardXpLog: 3.2,
  enemyCountSqrtCoeff: 0.35,
  maxEnemies: 4,
}
const LEVELING_CURVE = {
  hpBase: 8,
  hpLevelScale: 0.72,
  atkScale: 0.74,
  defScale: 0.58,
  luckScale: 0.9,
  xpBase: 45,
}

const SLOT_INFO = {
  weapon: {
    stat: "atk",
    sprite: "🗡️",
    prefixes: ["Ashen", "Rusted", "Feral", "Sky", "Brass", "Tempest", "Obsidian", "Gilded"],
    suffixes: ["Bite", "Howl", "Aether", "Fury", "Judgment", "Wolfsbane", "Vow", "Cathedral"],
  },
  armor: {
    stat: "def",
    sprite: "🛡️",
    prefixes: ["Iron", "Warden", "Moon", "Mire", "Sable", "Thorn", "Cloud", "Titan"],
    suffixes: ["Ward", "Bulwark", "Shell", "Pinnacle", "Gauntlet", "Mantle", "Bastion", "Emblem"],
  },
  amulet: {
    stat: "luck",
    sprite: "🔮",
    prefixes: ["Scholar", "Traveler", "Oracle", "Witch", "Hallowed", "Runed", "Sage", "Ghost"],
    suffixes: ["Echo", "Oath", "Pulse", "Fortune", "Shroud", "Aegis", "Boon", "Star"],
  },
}

const ROOM_TYPES = ["combat", "combat", "combat", "treasure", "forge", "rest"]
let itemCounter = 1

export class SeededRNG {
  constructor(seed = Date.now()) {
    const numericSeed = Number.isFinite(seed) ? Number(seed) : Date.now()
    this.state = (numericSeed >>> 0) || 1
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0
    return this.state / 0x100000000
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick(list) {
    return list[this.nextInt(0, list.length - 1)]
  }

  chance(value) {
    return this.next() < value
  }
}

export function createSeededRng(seed) {
  return new SeededRNG(seed)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value) {
  return clamp(value, 0, 1)
}

function weightedPickWeightedRarity(rng, depth) {
  const pressure = clamp01((Math.log1p(depth) - 0.9) / 6)
  const weights = RARITY_WEIGHTS.map((base, tier) => {
    const growth = Math.pow(1 + pressure * GAMMA, tier)
    return Math.max(0.0001, base * growth)
  })

  const total = weights.reduce((sum, value) => sum + value, 0)
  let needle = rng.next() * total
  for (let i = 0; i < weights.length; i++) {
    needle -= weights[i]
    if (needle <= 0) {
      return RARITY[i]
    }
  }

  return RARITY[RARITY.length - 1]
}

function itemBaseStat(depth, rng) {
  const curve = Math.log1p(depth)
  const smoothDepth = ITEM_STATS_GROWTH.sqrtScale * Math.sqrt(depth)
  const shapedDepth = Math.pow(curve, 1.35) * ITEM_STATS_GROWTH.depthBend
  const jitter = rng.next() * 0.8
  const value = ITEM_STATS_GROWTH.baseIntercept + smoothDepth + ITEM_STATS_GROWTH.logScale * curve + shapedDepth + jitter
  return Math.max(1, Math.round(value))
}

function enemyCountForDepth(rng, depth) {
  const base = 1 + Math.floor(Math.sqrt(depth) * ENEMY_CURVE.enemyCountSqrtCoeff)
  const volatility = rng.chance(0.2) ? 1 : 0
  return clamp(base + volatility, 1, ENEMY_CURVE.maxEnemies)
}

function countTreasureItems(rng, depth) {
  const base = Math.max(1, Math.floor(Math.log1p(depth) * 0.55))
  return clamp(base + rng.nextInt(0, 2), 1, 4)
}

function rewardGoldAtDepth(depth) {
  return Math.max(5, Math.round(ENEMY_CURVE.rewardGoldSlope * depth + ENEMY_CURVE.rewardGoldLog * Math.log1p(depth)))
}

function rewardXpAtDepth(depth) {
  return Math.max(4, Math.round(ENEMY_CURVE.rewardXpSlope * depth + ENEMY_CURVE.rewardXpLog * Math.sqrt(depth)))
}

function enemyHpAtDepth(depth, rng) {
  const d = Math.max(1, depth)
  const base = 22 + ENEMY_CURVE.hpLinear * d + ENEMY_CURVE.hpLog * Math.log1p(d) + ENEMY_CURVE.hpPow * Math.pow(d, ENEMY_CURVE.hpPowExp)
  const jitter = Math.round((rng.next() * 0.16 - 0.08) * base)
  return Math.max(6, Math.round(base + jitter))
}

function enemyAtkAtDepth(depth) {
  const d = Math.max(1, depth)
  const base = 3.8 + ENEMY_CURVE.atkLinear * d + ENEMY_CURVE.atkLog * Math.sqrt(d)
  return Math.max(1, Math.round(base))
}

function enemyDefAtDepth(depth) {
  const d = Math.max(1, depth)
  const base = 1.4 + ENEMY_CURVE.defLinear * d + ENEMY_CURVE.defSqrt * Math.sqrt(d)
  return Math.max(0, Math.round(base))
}

function lootChanceAtDepth(depth, rng) {
  const d = Math.max(1, depth)
  const pressure = clamp01((Math.log1p(d) - 0.6) / 5.2)
  const base = 28 + 30 * Math.pow(pressure, 1.05) + 12 * Math.log1p(d)
  const jitter = rng.nextInt(-6, 7)
  return clamp(Math.round(base + jitter), 12, 88)
}

function nextXpRequirement(currentLevel) {
  const level = Math.max(1, currentLevel)
  const curve = 1 + 0.35 * Math.log2(level + 1) + 0.08 * (level - 1)
  return Math.max(32, Math.round(LEVELING_CURVE.xpBase * curve))
}

function nextLevelStatGains(state) {
  const level = Math.max(1, state.hero.level)
  return {
    hp: Math.max(6, Math.round(LEVELING_CURVE.hpBase + level * LEVELING_CURVE.hpLevelScale / 1.6)),
    attack: Math.max(2, Math.round(LEVELING_CURVE.atkScale + Math.log2(level + 1) * 0.8)),
    defense: Math.max(1, Math.round(LEVELING_CURVE.defScale + Math.log2(level + 1) * 0.6)),
    luck: Math.max(1, Math.round(LEVELING_CURVE.luckScale)),
  }
}

export function calculateUpgradeCost(item) {
  const base = 50
  const rarityModifier = 1 + item.rarity.level * 0.4
  const growth = 1 + Math.pow(item.level, 0.75) * 0.34
  return Math.round(base * (item.level + 1) * growth * rarityModifier)
}

function scoreStatValue(stat, value) {
  const weights = {
    atk: 1.35,
    def: 1.2,
    luck: 1.05,
  }
  return value * (weights[stat] || 1)
}

function getItemScore(item) {
  const base = Object.entries(item.stats).reduce((sum, [stat, value]) => sum + scoreStatValue(stat, value), 0)
  const rarityBonus = 3 + item.rarity.level * 4
  const levelBonus = item.level * 2
  return Math.round(base * rarityBonus + levelBonus)
}

export function calculateItemValue(item) {
  return getItemScore(item)
}

export function calculateTotalLootValue(state) {
  const equippedItems = [state.equipped.weapon, state.equipped.armor, state.equipped.amulet].filter(Boolean)
  const all = [...equippedItems, ...state.inventory]
  return all.reduce((sum, item) => sum + calculateItemValue(item), 0)
}

export function calculateRunScore(state) {
  const lootValue = calculateTotalLootValue(state)
  return Math.round(lootValue + state.gold + state.hero.level * 240 + state.depth * 95 + state.turn * 1.5)
}

export function autoSellInferiorItems(state) {
  const sold = []
  for (let idx = state.inventory.length - 1; idx >= 0; idx--) {
    const item = state.inventory[idx]
    const equipped = state.equipped[item.slot]
    if (!equipped || item.slot !== equipped.slot) {
      continue
    }

    if (getItemScore(item) < getItemScore(equipped)) {
      const soldItem = state.inventory.splice(idx, 1)[0]
      const salePrice = Math.max(2, Math.round(calculateItemValue(soldItem) * 0.75))
      state.gold += salePrice
      sold.push({ name: soldItem.name, value: salePrice, id: soldItem.id })
    }
  }

  if (sold.length > 0) {
    const details = sold.map((entry) => `${entry.name} (${entry.value}g)`).join(", ")
    state.log.push(`Auto-sold ${sold.length} item(s): ${details}.`)
  } else {
    state.log.push("No inferior items found for auto-sell.")
  }

  return sold
}

export function createItem(rng, depth, slot = "") {
  const chosenSlot = slot || rng.pick(["weapon", "armor", "amulet"])
  const info = SLOT_INFO[chosenSlot]
  const rarity = weightedPickWeightedRarity(rng, depth)

  const base = itemBaseStat(depth, rng)
  const rarityBoost = rarity.multiplier
  const statValue = Math.max(1, Math.round(base * rarityBoost + rng.nextInt(0, 3)))
  const secondaryChance = clamp01(ITEM_STATS_GROWTH.secondaryChance + Math.log1p(depth) / 28)
  const secondary = rng.chance(secondaryChance)

  const item = {
    id: `item-${itemCounter++}`,
    slot: chosenSlot,
    rarity,
    sprite: info.sprite,
    level: 1,
    name: `${rng.pick(info.prefixes)} ${secondary ? "" : ""}${rng.pick(info.suffixes)}`.trim(),
    stats: {
      [info.stat]: Math.max(1, statValue),
    },
  }

  if (secondary) {
    const alt = chosenSlot === "weapon" ? "luck" : chosenSlot === "armor" ? "atk" : "def"
    item.stats[alt] = Math.max(1, Math.round(statValue * 0.4 + rng.nextInt(0, 2)))
  }

  return item
}

function pickEnemyName(rng) {
  return rng.pick([
    "Grave Stalker",
    "Muck Wight",
    "Ash Wolf",
    "Saltback",
    "Warden Spider",
    "Ironmuck",
    "Voidling",
    "Cracked Colossus",
  ])
}

function createEnemy(rng, depth) {
  const hp = enemyHpAtDepth(depth, rng)
  const attack = enemyAtkAtDepth(depth) + rng.nextInt(-1, 1)
  const defense = enemyDefAtDepth(depth) + rng.nextInt(-1, 1)
  return {
    id: `enemy-${Date.now()}-${rng.nextInt(1, 99999)}`,
    name: pickEnemyName(rng),
    hp,
    maxHp: hp,
    attack,
    defense,
    reward: {
      gold: Math.max(5, rewardGoldAtDepth(depth) + rng.nextInt(-4, 6)),
      xp: Math.max(4, rewardXpAtDepth(depth) + rng.nextInt(-3, 5)),
      lootChance: lootChanceAtDepth(depth, rng),
    },
  }
}

function generateLoot(rng, depth, roomType) {
  if (roomType !== "combat" && roomType !== "treasure") {
    return []
  }
  const count = roomType === "treasure"
    ? countTreasureItems(rng, depth)
    : rng.nextInt(0, clamp(1 + Math.floor(Math.sqrt(depth) * 0.22), 1, 3))
  return Array.from({ length: count }, () => createItem(rng, depth))
}

export function generateRoom(rng, depth, roomIndex) {
  const room = {
    id: `room-${roomIndex}`,
    depth,
    biome: rng.pick(BIOMES),
    type: rng.pick(ROOM_TYPES),
    discovered: false,
    cleared: false,
    enemies: [],
    chest: [],
    goldBonus: 0,
    message: "",
  }

  if (room.type === "combat") {
    const count = enemyCountForDepth(rng, depth)
    room.enemies = Array.from({ length: count }, () => createEnemy(rng, depth))
    room.chest = generateLoot(rng, depth, room.type)
    room.message = `${room.biome} holds ${count} hostile target${count > 1 ? "s" : ""}.`
  } else if (room.type === "treasure") {
    room.chest = generateLoot(rng, depth, room.type)
    room.goldBonus = rng.nextInt(6, 18) + depth
    room.message = `${room.biome} hides a reliquary beneath broken stonework.`
  } else if (room.type === "forge") {
    room.message = `${room.biome} hides a forge of broken sigils. Perfect for upgrades.`
  } else {
    room.message = `${room.biome} is calm. A rest point with healing and reflection.`
  }

  room.discovered = true
  return room
}

export function createNewGame(seed = Date.now(), heroName = "Ember") {
  const rng = createSeededRng(seed)
  const hero = {
    name: heroName,
    level: 1,
    xp: 0,
    xpToNext: LEVELING_CURVE.xpBase,
    hp: 110,
    maxHp: 110,
    attack: 13,
    defense: 4,
    luck: 2,
    alive: true,
  }

  const weapon = createItem(rng, 1, "weapon")
  const armor = createItem(rng, 1, "armor")

  const game = {
    seed,
    rng,
    turn: 0,
    roomIndex: 0,
    depth: 1,
    hero,
    gold: 120,
    potions: 3,
    equipped: {
      weapon,
      armor,
      amulet: null,
    },
    autoMode: false,
    inventory: [createItem(rng, 1), createItem(rng, 1), createItem(rng, 2)],
    log: ["A new expedition begins beneath the sky-forks."],
  }

  game.currentRoom = generateRoom(rng, game.depth, game.roomIndex)
  game.log.push(game.currentRoom.message)
  return game
}

function awardRewards(state, enemy) {
  state.gold += enemy.reward.gold
  const totalXp = enemy.reward.xp
  state.hero.xp += totalXp
  while (state.hero.xp >= state.hero.xpToNext) {
    state.hero.xp -= state.hero.xpToNext
    state.hero.level += 1
    state.hero.xpToNext = nextXpRequirement(state.hero.level)
    const growth = nextLevelStatGains(state)
    state.hero.maxHp += growth.hp
    state.hero.hp = state.hero.maxHp
    state.hero.attack += growth.attack
    state.hero.defense += growth.defense
    state.hero.luck += growth.luck
    state.log.push(`${state.hero.name} levels up to ${state.hero.level}.`)
  }

  const willDrop = state.rng.chance(enemy.reward.lootChance / 100)
  if (willDrop) {
    const loot = createItem(state.rng, state.depth)
    state.inventory.push(loot)
    state.log.push(`Drop secured: ${loot.name}.`)
  }
}

function allEnemiesDead(room) {
  return room.enemies.length > 0 && room.enemies.every((enemy) => enemy.hp <= 0)
}

function allDeadOrNoEnemies(room) {
  return room.enemies.length === 0 || allEnemiesDead(room)
}

export function hasAliveEnemies(state) {
  return !allDeadOrNoEnemies(state.currentRoom)
}

function enemyRetaliation(state, enemy) {
  const totalDef = state.hero.defense + (state.equipped.armor?.stats.def || 0)
  const damageScale = 1 / (1 + totalDef / 19)
  const volatility = clamp(enemy.attack * 0.12, 0, 1.8)
  const damage = Math.max(1, Math.round((enemy.attack + state.rng.next() * volatility) * damageScale))
  state.hero.hp -= damage
  state.log.push(`${enemy.name} retaliates for ${damage}.`)
  if (state.hero.hp <= 0) {
    state.hero.hp = 0
    state.hero.alive = false
    state.log.push("You are defeated. Return to camp to start again.")
  }
}

export function attackEnemy(state, enemyIndex) {
  if (!state.hero.alive) {
    state.log.push("You cannot act while defeated.")
    return
  }
  if (state.currentRoom.type !== "combat") {
    state.log.push("No enemies in this room.")
    return
  }
  if (allEnemiesDead(state.currentRoom)) {
    state.log.push("All threats are gone. Move deeper.")
    return
  }

  const enemy = state.currentRoom.enemies[enemyIndex]
  if (!enemy || enemy.hp <= 0) {
    state.log.push("That target cannot be attacked.")
    return
  }

  const weapon = state.equipped.weapon
  const baseDamage = state.hero.attack + (weapon?.stats.atk || 0)
  const critChance = 0.08 + (state.equipped.amulet?.stats.luck || 0) / 80 + state.hero.luck / 150
  const didCrit = state.rng.chance(clamp(critChance, 0.02, 0.65))
  const variance = state.rng.next() * 0.4 + 0.8
  const defenseScale = 1 / (1 + enemy.defense / 18)
  const bonusCrit = didCrit ? 1.6 : 1
  const growthFromLevel = 1 + ((state.equipped.weapon?.level || 0) / 8)
  const damage = Math.max(
    1,
    Math.floor((baseDamage * growthFromLevel * bonusCrit * variance) * defenseScale)
  )

  enemy.hp -= damage
  state.turn += 1
  state.log.push(`You strike ${enemy.name} for ${damage}${didCrit ? " (critical)" : ""}.`)

  if (enemy.hp <= 0) {
    enemy.hp = 0
    state.log.push(`${enemy.name} is defeated.`)
    awardRewards(state, enemy)
    if (allEnemiesDead(state.currentRoom)) {
      state.currentRoom.cleared = true
      state.depth += 1
      state.log.push(`Room ${state.currentRoom.id} cleared.`)
    }
    return
  }

  if (state.currentRoom.enemies.some((candidate) => candidate.hp > 0)) {
    const counter = state.currentRoom.enemies.find((candidate) => candidate.hp > 0)
    if (counter) {
      enemyRetaliation(state, counter)
    }
  }
}

export function collectTreasure(state) {
  if (state.currentRoom.chest.length === 0 && state.currentRoom.goldBonus <= 0) {
    state.log.push("Nothing to collect.")
    return
  }

  if (state.currentRoom.goldBonus > 0) {
    state.gold += state.currentRoom.goldBonus
    state.log.push(`You gather ${state.currentRoom.goldBonus} gold.`)
    state.currentRoom.goldBonus = 0
  }

  state.currentRoom.chest.forEach((loot) => {
    state.inventory.push(loot)
    state.log.push(`Recovered ${loot.name}.`)
  })
  state.currentRoom.chest = []

  if (state.currentRoom.type === "treasure") {
    state.currentRoom.cleared = true
  }
}

export function restInRoom(state) {
  if (state.currentRoom.type !== "rest") {
    state.log.push("No safe camp here.")
    return
  }
  const restHeal = Math.round(18 + Math.sqrt(state.hero.maxHp) * 1.1)
  const healed = Math.min(state.hero.maxHp, state.hero.hp + restHeal)
  const gained = healed - state.hero.hp
  state.hero.hp = healed
  state.log.push(`You rest and recover ${gained} HP.`)
}

export function consumePotion(state) {
  if (state.potions <= 0) {
    state.log.push("No potions remaining.")
    return
  }
  if (state.hero.hp === state.hero.maxHp) {
    state.log.push("Health already full.")
    return
  }
  state.potions -= 1
  const restore = Math.round(34 + Math.sqrt(state.hero.maxHp) * 1.25)
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + restore)
  state.log.push(`Potion restores ${restore} HP.`)
}

export function progressToNextRoom(state) {
  if (!state.currentRoom) {
    return
  }

  if (state.currentRoom.type === "combat" && !allDeadOrNoEnemies(state.currentRoom)) {
    state.log.push("You must clear combat first.")
    return
  }

  if (!state.currentRoom) {
    return
  }

  state.roomIndex += 1
  state.currentRoom = generateRoom(state.rng, state.depth, state.roomIndex)
  state.log.push(`You enter ${state.currentRoom.id}.`)
  state.log.push(state.currentRoom.message)
}

export function equipItem(state, itemId) {
  const index = state.inventory.findIndex((item) => item.id === itemId)
  if (index === -1) {
    state.log.push("Item not found.")
    return
  }

  const item = state.inventory[index]
  if (!item.slot || !state.equipped.hasOwnProperty(item.slot)) {
    state.log.push("Unknown item slot.")
    return
  }

  const previous = state.equipped[item.slot]
  state.equipped[item.slot] = item
  state.inventory.splice(index, 1)
  state.log.push(`Equipped ${item.name} (${item.slot}).`)
  if (previous) {
    previous.name = previous.name
    state.inventory.push(previous)
  }
}

export function discardItem(state, itemId) {
  const index = state.inventory.findIndex((item) => item.id === itemId)
  if (index === -1) {
    state.log.push("Nothing to discard for that item id.")
    return
  }

  const discarded = state.inventory.splice(index, 1)[0]
  state.log.push(`Discarded ${discarded.name}.`)
}

export function upgradeItem(state, itemId) {
  const equipped = state.equipped.weapon?.id === itemId ? state.equipped.weapon
    : state.equipped.armor?.id === itemId ? state.equipped.armor
    : state.equipped.amulet?.id === itemId ? state.equipped.amulet
    : null

  if (!equipped) {
    state.log.push("Choose an equipped item to upgrade.")
    return
  }

  const cost = calculateUpgradeCost(equipped)
  if (state.gold < cost) {
    state.log.push(`Need ${cost} gold to upgrade ${equipped.name}.`)
    return
  }

  state.gold -= cost
  equipped.level += 1
  const statKeys = Object.keys(equipped.stats)
  const statToBoost = state.rng.pick(statKeys)
  const info = SLOT_INFO[equipped.slot]
  equipped.stats[statToBoost] += 1 + Math.floor(equipped.level / 2)
  if (equipped.level === 3 || equipped.level === 6) {
    const idx = Math.min(RARITY.length - 1, equipped.rarity.level + 1)
    equipped.rarity = RARITY[idx]
    if (equipped.name.includes(" ")) {
      const [first, ...rest] = equipped.name.split(" ")
      equipped.name = `${first} ${rngSuffix(info.suffixes, idx)}`
    }
  }
  state.log.push(`${equipped.name} upgraded to level ${equipped.level}.`)
}

function rngSuffix(suffixes, tier) {
  const base = suffixes[tier % suffixes.length]
  return `${base} +${tier}`
}

export function applyCheatSetState(state, values = {}) {
  Object.assign(state, values)
}
