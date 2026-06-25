# Hint Bank

A hint-giving party game for **2–8 players** — a web adaptation of the Google Slides game from **["Guess The Pokemon But Use The FEWEST Hints!"](https://www.youtube.com/watch?v=10x-S7t1Tq0)** (ZaneGames & guests Peebr, Cush, and Lockstin).

Hint Bank is a **general party game that ships as editions.** This release is the first version of the **Pokémon Edition**, covering the full National Dex.

## The idea

One player is the **hinter** and holds 10 secret answers, revealed to them one at a time. They have to get everyone else to guess each answer, but they can only give hints using words from a **Hint Bank** capped at **40 words** for their whole turn. Words in the **Hint Bank** can be used as many times as the **Hinter** would like, even reusing the same hint to get the other players to try again.

This is the **one-device** version: the group plays in person, the hinter holds the phone or tablet, and hints and guesses happen out loud. The app is the board, the rulekeeper, and the scoreboard.

## How a game flows

1. The hinter sees the current secret answer (1 of 10).
2. They give a **hint**: any selection of one or more words from the Hint Bank, adding any number of new words first if there's room.
3. Every other player gets **one guess**, out loud.
4. Someone's right → the answer is tagged with that player and the next one is revealed. Nobody's right → the hinter gives another hint.
5. After all 10 are resolved, scores are tallied and the device passes to the next hinter.

**Stuck on an answer?** The hinter can **reroll** it for a fresh random one, but each reroll permanently burns one of the 40 Hint Bank slots. Once the bank is full, the hinter can **end the turn**, forfeiting the rest for a points penalty.

## Scoring

- **Hinter:** `25 − (Hint Bank entries) − (5 if the turn ended early)`. The less hint words and rerolls you have to use the more points you earn. Scores can go negative.
- **Guessers:** `+1` for every answer you personally land. Guessing more than once on a single hint costs `−1` per extra guess.

The hinter rotates so everyone hints once per **session**, and totals carry across the session. Highest score takes the crown!

## Tech

- **React + Vite + TypeScript**, plain CSS Modules, no backend.
- The rules live in a small, self-contained engine (`src/engine/`) that's category-agnostic for future editions.
- Pokémon names and sprites are bundled at build time from the PokéAPI GitHub mirror (see `scripts/`).
- Static build, deployed via GitHub Pages.

## Running it

Run `npm install` first on a fresh checkout, then:

- `npm run dev` — play locally.
- `npm test` — run the engine tests.
- `npm run build` — produce the static build.

## Roadmap

This release is the in-person, one-device game. Beyond it: a shared-screen mode (a TV shows the public board while the hinter uses a private phone), pass-and-play, and full per-device online multiplayer — plus more Pokémon-Edition categories and future editions behind the same engine.

## Credit

Game concept by the creators of the original video. This project is an unofficial, fan-made web adaptation.
