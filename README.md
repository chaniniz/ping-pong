# Ping-Pong

This repository contains a Galaga style game implemented purely with HTML, CSS and JavaScript.

## Features
- Keyboard controls (arrow keys for movement and space bar to fire)
- Enemies with varied patterns, including occasional boss fights
- Collectible power-ups for shields, rapid fire and spread shots
- Shooting causes an overheat gauge to fill; overheating disables firing
- Animated star field background and simple explosion effects
- Stage system with increasing difficulty, score tracking and lives
- Ten data driven stages each with unique background, enemy behaviour and optional bosses
- Optional login to save your progress between sessions

### Customising Images
Sprites are loaded from `static/images/`. The repository does not include any
artwork, so copy your own `player.png` and optional `enemy#.png` files into this
folder. `static/game.js` will automatically pick up the images when you refresh
the page, allowing you to swap them at any time.

## Running
Open `login.html` in a browser or serve the folder with any static file server.
Logging in stores your current stage using local storage. Playing as a guest does not save progress.

Stages are defined in `static/game.js` inside the `stageData` array. Each object
specifies the background, enemy types, power-ups and optional boss for that
stage. The `loadStage` function applies these settings when advancing.
