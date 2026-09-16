# Coordinate Zero

A minimalist browser geography game: reveal clues, place a pin on the world map, and score points based on distance.

![No dependencies](https://img.shields.io/badge/dependencies-none-59f2c3)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-59f2c3)
![License](https://img.shields.io/badge/license-MIT-59f2c3)

## Features

- Five randomly selected locations per game
- Three progressively easier clues for each location
- Distance calculated with the Haversine formula
- Score based on accuracy and clues used
- Keyboard controls and reduced-motion support
- Personal best stored locally in the browser
- Shareable result grid
- Responsive layout for mobile and desktop
- No frameworks, build tools, accounts, or API keys

## Run locally

Open `index.html` in your browser. That is all.

For a local server (optional):

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages** in GitHub.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.

GitHub will show the live URL when deployment finishes.

## Customise it

Add or edit destinations in `locations.js`. Each destination uses this shape:

```js
{
  name: "Place, Country",
  lat: 0,
  lon: 0,
  clues: ["Hard clue", "Medium clue", "Easy clue"],
  fact: "A short fact shown after the guess."
}
```

Colours, spacing, and typography are controlled by variables at the top of `styles.css`.

## How scoring works

The game uses the Haversine formula to calculate the great-circle distance between the guessed and actual coordinates. Distance reduces the base score exponentially. Revealing clue two costs 150 available points; clue three costs 300.

