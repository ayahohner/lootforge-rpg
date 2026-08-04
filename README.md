# Lootforge

Lootforge is a browser RPG prototype with procedural room generation, combat, loot drops, equipping, and upgrades.

## Run locally

```bash
cd /Users/benhohner/Documents/Programming/lootforge-rpg
npm run start
```

Then open `http://localhost:4173` in your browser.

## Tests

```bash
cd /Users/benhohner/Documents/Programming/lootforge-rpg
npm test
```

## Gameplay

- Start a run with a fixed seed or random seed.
- Enter procedural rooms: combat, treasure, rest, and forge.
- Equip gear from inventory for combat stats.
- Spend gold to upgrade equipped items.
- Use potions and collect treasure before descending.
- Toggle **Auto-run mode** for automatic combat, potion use, loot collection, resting, and room progression.
- When defeated, a Game Over screen now shows your run score, best score, and total loot value, with a replay button.
- Added a quick **Auto-Sell Inferior** action to liquidate backpack items below current equipped power.
