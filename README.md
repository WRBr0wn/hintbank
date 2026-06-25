# Hint Bank

A hint-giving party game for **2–8 players** — a web adaptation of the Google Slides game from **["Guess The Pokemon But Use The FEWEST Hints!"](https://www.youtube.com/watch?v=10x-S7t1Tq0)** (ZaneGames & guests Peebr, Cush, and Lockstin).

Hint Bank is a **general party game that ships as editions.** v1 is **Pokémon Edition**.

> **In development.** This is the v1 build (single-device mode). How to play is below.

## The idea

One player is the **hint giver** and holds 10 secret answers, revealed one at a time. They must get everyone else to guess each answer — but they can only give hints using words from a shared **Hint Bank** of up to **40 words**, reused across all 10 answers for the entire game.

## How a game flows

1. The hint giver sees the current secret answer (1 of 10).
2. They give a **hint** — any non-empty selection of words from the Hint Bank (adding new words first if there's room).
3. Every other player gets **one guess**.
4. Right answer → it's tagged with that player's name and the next answer is revealed. Nobody right → give another hint.
5. After all 10 are resolved, scores are tallied.

**Scoring:** the hint giver scores `25 − (Hint Bank entries)`, so a leaner bank = more points (it can go negative), and every reroll marker costs a point too. Each guesser scores +1 for every answer they personally landed. The hint giver rotates so everyone gives once per **session**, and totals carry across the session.

**Stuck on an answer?** The giver can **reroll** it for a fresh random answer — but each reroll permanently burns one of the 40 Hint Bank slots, so it eats into your own vocabulary. Once the bank is full, the giver can **end the turn** (forfeiting the rest) for a points penalty.

## Tech

- **React + Vite + TypeScript**, plain CSS Modules.
- Pokémon data is bundled at build time from the PokéAPI GitHub mirror (see `scripts/`).
- Static build, deployed via GitHub Pages.

## Development

Run `npm install` first on a fresh checkout (`node_modules` isn't committed), then `npm test -- --run` for the engine tests, or `npm run dev` to play locally.

## Roadmap (high level)

- **v1 (now):** single-device game-master tool, Pokémon Edition.
- **Later:** public second screen, pass-and-play, full per-device multiplayer; more Pokémon-Edition categories (items, gym leaders, towns, badges, professors); future editions.

## Credit

Game concept by the creators of the original video. This project is an unofficial fan-made web adaptation.
