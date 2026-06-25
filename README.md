# Hint Bank

A hint-giving party game for **2–8 players** — a web adaptation of the Google Slides game from **["Guess The Pokemon But Use The FEWEST Hints!"](https://www.youtube.com/watch?v=10x-S7t1Tq0)** (ZaneGames & guests Peebr, Cush, and Lockstin).

Hint Bank is a **general party game that ships as editions.** This release is the first version of the **Pokémon Edition**, covering the full National Dex.

## The idea

One player is the **hinter** and holds 10 secret answers, revealed to them one at a time. They have to get everyone else to guess each answer, but they can only give hints using words from a **Hint Bank** capped at **40 words** for their whole turn. Words in the **Hint Bank** can be used as many times as the **Hinter** would like, even reusing the same hint to get the other players to try again.

However you play, the app is the board, the rulekeeper, and the scoreboard. Hints and guesses happen out loud; the app tracks the Hint Bank, the score, and whose turn it is.

## Ways to play

Pick a mode at setup. It locks for the session.

- **In Person: One Device** - the group is in the same room and the hinter holds the phone or tablet. They see the secret answer right on screen.
- **Online: One Device** - built for Discord screen-share. The app still deals the answers, but the secret one stays covered until the hinter presses and holds to peek, so it never lands on the stream.
- **Online: One Device + Randomizer** - the most faithful to the original video. The shared screen is a fully public board (Hint Bank, results, scores), the hinter pulls answers from somewhere private, and types each one in once it's guessed. Nothing secret ever touches the broadcast. A built-in [randomizer page](#) can draw Pokémon for the hinter in a separate tab.

Online multiplayer (one device per player) is on the roadmap.

## How a game flows

1. The hinter knows the current secret answer (1 of 10) — shown on screen, or held privately, depending on the mode.
2. They give a **hint**: any selection of one or more words from the Hint Bank, adding any number of new words first if there's room.
3. Every other player gets **one guess**, out loud.
4. Someone's right → the answer is tagged with that player and the next one comes up. Nobody's right → the hinter gives another hint.
5. After all 10 are resolved, scores are tallied and the turn passes to the next hinter.

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

Three modes are live now: In Person, Online: One Device, and Online + Randomizer. Still ahead: full per-device online multiplayer (one screen per player, no passing), more Pokémon-Edition categories (items, gym leaders, towns, badges, professors), and future editions behind the same engine.

## Credit

Game concept by the creators of the original video. This project is an unofficial, fan-made web adaptation.
