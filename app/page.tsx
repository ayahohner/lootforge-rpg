"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    import("../app.js").catch(() => {
      if (active) setLoadError(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="app">
        <header>
          <h1>Lootforge</h1>
          <p>Procedural rogue-RPG. Loot, equip, upgrade, and descend.</p>
          <div className="seed-row">
            <label htmlFor="seedInput">Seed</label>
            <input id="seedInput" type="number" inputMode="numeric" />
            <button id="newRun" type="button">
              Start Run
            </button>
          </div>
          <div className="auto-row">
            <input type="checkbox" id="autoMode" />
            <label htmlFor="autoMode">Auto-run mode</label>
          </div>
        </header>

        {loadError ? (
          <p className="boot-error" role="alert">
            Lootforge could not start. Refresh the page to try again.
          </p>
        ) : null}

        <main className="layout">
          <section className="panel hero-panel" aria-labelledby="commander-title">
            <div className="panel-titlebar">
              <h2 id="commander-title">Commander</h2>
              <span className="mini-note">Run status</span>
            </div>
            <div id="heroCards" />
            <div id="resources" />
            <div className="actions">
              <button id="attackButton" type="button" disabled>
                Attack Target
              </button>
              <button id="collectButton" type="button">
                Collect Loot
              </button>
              <button id="progressButton" type="button">
                Descend
              </button>
              <button id="potionButton" type="button">
                Use Potion
              </button>
              <button id="restButton" type="button">
                Rest
              </button>
            </div>
          </section>

          <section className="panel room-panel" aria-labelledby="roomTitle">
            <div className="panel-titlebar">
              <h2 id="roomTitle">Room</h2>
              <span className="mini-note">Threats &amp; loot</span>
            </div>
            <div id="roomMessage" aria-live="polite" />
            <div id="enemyList" />
          </section>

          <section className="panel equip-panel" aria-labelledby="inventory-title">
            <div className="panel-titlebar">
              <h2 id="inventory-title">Inventory</h2>
              <span className="mini-note">Loadout &amp; backpack</span>
            </div>
            <button id="autoSellButton" className="toolbar-btn" type="button">
              Auto-Sell Inferior
            </button>
            <div className="subsection">
              <h3>Loadout</h3>
              <div id="equipped" />
              <h3>Backpack</h3>
              <div id="inventory" />
            </div>
          </section>

          <section className="panel log-panel" aria-labelledby="run-log-title">
            <div className="panel-titlebar">
              <h2 id="run-log-title">Run Log</h2>
              <span className="mini-note">Recent events</span>
            </div>
            <ul id="log" aria-live="polite" />
          </section>
        </main>
      </div>

      <section
        id="gameOverModal"
        className="game-over hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
      >
        <div className="game-over__inner panel">
          <h2 id="game-over-title">Game Over</h2>
          <p>
            Your run ended in <strong id="deathRoom" />.
          </p>
          <p>
            Run score: <strong id="runScore" />
          </p>
          <p>
            Best score: <strong id="highScore" />
          </p>
          <p>
            Total loot value: <strong id="lootValue" />
          </p>
          <button id="playAgainButton" type="button">
            Play Again
          </button>
        </div>
      </section>
    </>
  );
}
