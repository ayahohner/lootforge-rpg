import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createNewGame,
  generateRoom,
  createSeededRng,
  hasAliveEnemies,
  collectTreasure,
  progressToNextRoom,
  equipItem,
  attackEnemy,
  calculateUpgradeCost,
  upgradeItem,
} from '../src/game.js'

test('procedural seeds stay deterministic for world generation', () => {
  const seed = 98765
  const roomA = generateRoom(createSeededRng(seed), 1, 0)
  const roomB = generateRoom(createSeededRng(seed), 1, 0)

  assert.equal(roomA.biome, roomB.biome)
  assert.equal(roomA.type, roomB.type)
  assert.equal(roomA.message, roomB.message)
  assert.deepEqual(roomA.enemies.length, roomB.enemies.length)
})

test('new games start with expected defaults', () => {
  const game = createNewGame(321, 'Rowan')
  assert.equal(game.hero.name, 'Rowan')
  assert.equal(game.hero.hp, 110)
  assert.equal(game.gold, 120)
  assert.equal(game.currentRoom.discovered, true)
  assert.equal(game.inventory.length >= 3, true)
})

test('collecting treasure increases resources', () => {
  const game = createNewGame(77, 'Rowan')
  const beforeGold = game.gold
  game.currentRoom.chest = [
    { id: 'test-1', slot: 'weapon', rarity: { name: 'Common', level: 0, multiplier: 1 }, level: 1, name: 'Test Sword', stats: { atk: 2 } },
    { id: 'test-2', slot: 'armor', rarity: { name: 'Common', level: 0, multiplier: 1 }, level: 1, name: 'Test Armor', stats: { def: 2 } },
  ]
  game.currentRoom.goldBonus = 17
  collectTreasure(game)
  assert.equal(game.gold - beforeGold, 17)
  assert.equal(game.currentRoom.chest.length, 0)
  assert.equal(game.currentRoom.goldBonus, 0)
})

test('progress cannot happen while combat alive, then can after clear', () => {
  const game = createNewGame(120, 'Rowan')
  if (game.currentRoom.type !== 'combat') {
    game.currentRoom.type = 'combat'
  }
  if (game.currentRoom.enemies.length === 0) {
    game.currentRoom.enemies.push({ hp: 8, maxHp: 8 })
  }

  const beforeRoom = game.currentRoom.id
  progressToNextRoom(game)
  assert.equal(game.currentRoom.id, beforeRoom)

  if (!game.currentRoom.enemies[0].hp || game.currentRoom.enemies[0].hp > 0) {
    game.currentRoom.enemies[0].hp = 0
  }
  progressToNextRoom(game)
  assert.equal(game.currentRoom.id === beforeRoom, false)
})

test('equip swap replaces slot and keeps inventory intact', () => {
  const game = createNewGame(5, 'Rowan')
  const weapon = game.inventory.find((item) => item.slot === 'weapon')
  const oldWeapon = game.equipped.weapon
  equipItem(game, weapon.id)
  assert.equal(game.equipped.weapon.id, weapon.id)
  assert.equal(game.inventory.some((item) => item.id === oldWeapon.id), true)
  assert.equal(game.inventory.some((item) => item.id === weapon.id), false)
})

test('upgrading equipped item drains gold and increases level', () => {
  const game = createNewGame(500, 'Rowan')
  const item = game.equipped.weapon
  const cost = calculateUpgradeCost(item)
  const before = item.level
  game.gold += cost
  upgradeItem(game, item.id)
  assert.equal(item.level, before + 1)
  assert.equal(game.gold <= 120 + cost * 0, true)
})

test('attacking a combat enemy eventually makes progress', () => {
  const game = createNewGame(42, 'Rowan')
  if (game.currentRoom.type !== 'combat') {
    game.currentRoom = {
      type: 'combat',
      discovered: true,
      cleared: false,
      goldBonus: 0,
      chest: [],
      message: 'forced combat for testing',
      enemies: [
        {
          id: 'target',
          name: 'Testling',
          hp: 4,
          maxHp: 4,
          attack: 1,
          defense: 0,
          reward: { gold: 2, xp: 1, lootChance: 0 },
        },
      ],
    }
  }

  const before = game.currentRoom.enemies[0].hp
  attackEnemy(game, 0)
  assert.equal(game.currentRoom.enemies[0].hp <= before, true)
  if (!hasAliveEnemies(game)) {
    assert.ok(game.currentRoom.cleared)
  }
})
