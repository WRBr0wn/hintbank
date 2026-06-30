# Hint Bank

A hint-giving party game for **2–8 players**, played on one shared screen.

Hint Bank is a **general party game that ships as editions.** You pick an edition from the main menu, then play. The **Pokémon Edition** is the one that's built out today, covering the full National Dex and other assorted categories; more editions are on the way behind the same engine.

## The idea

One player is the **hinter** and holds a set of secret answers (5 to 10, your call), revealed to them one at a time. They have to get everyone else to guess each answer, but they can only give hints using words from a **Hint Bank** capped at **40 words** for their whole turn. Words in the **Hint Bank** can be used as many times as the **Hinter** would like, even reusing the same hint to get the other players to try again.

However you play, the app is the board, the rulekeeper, and the scoreboard. Hints and guesses happen out loud; the app tracks the Hint Bank, the score, and whose turn it is.

## Editions

The app opens on a main menu where you pick an edition. An edition is a self-contained set of answers and identity - its categories, its display name, and its own credits and disclaimers. The engine underneath stays the same; only the content changes.

- **Pokémon** - live, the full edition described below.
- **Geography**, **Books**, **Marvel** - listed as "soon" placeholders for now.

## Ways to play

Pick a mode at setup. It locks for the session.

- **In Person: One Device** - the group is in the same room and the hinter holds the phone or tablet. They see the secret answer right on screen.
- **Online: One Device** - built for simple, all included Discord screen-share. The app still deals the answers on the main screen, but the secret one stays covered until the hinter presses and holds to peek.
- **Online: One Device + Randomizer** - the best for streaming. The shared screen is a fully public board (Hint Bank, results, scores), the hinter pulls answers from somewhere private, and types each one in once it's guessed. Nothing secret ever touches the broadcast. A built-in [randomizer](https://wrbr0wn.github.io/hintbank/pokemon-edition/randomizer/), with its own category picker, can draw answers for the hinter in a separate tab or different device.

Online multiplayer (one device per player) is on the roadmap.

## Categories (Pokémon edition)

Within the Pokémon edition, pick one or more answer categories at setup. They mix into a single pool, so a turn can pull from any of them. Live now:

- **Pokémon** - the full National Dex.
- **Gym Leaders**
- **Towns & Cities**
- **Games**
- **Items**
- **Routes & Areas**
- **Badges**

Professors are coming. In Randomizer mode, categories are picked on the randomizer page instead of at setup.

## Difficulty & turn length

Two more dials at setup, both optional - the defaults are the original game.

- **Difficulty** picks the hinter's starting cutoff for a full turn: **Easy (30)**, **Regular (25)**, or **Hard (20)**. The lower the cutoff, the sooner the score drains toward zero, so a sharper bank matters more.
- **Answers per turn** sets how many answers a hinter holds, from **5 to 10**, for shorter or longer turns.

The cutoff scales with turn length: the difficulty is the cutoff for a full 10-answer turn, and a shorter turn scales it down in proportion, so a 5-answer turn isn't secretly easier than a 10-answer one. The Hint Bank stays a hard 40 words either way - the cutoff is the lever, not the bank. The Hint Bank's color bands scale to your chosen cutoff, so the gauge always reads true.

## How a game flows

1. Pick an edition from the main menu, then set up the game (players, mode, categories, difficulty, turn length).
2. The hinter knows the current secret answer (1 of however many you set) — shown on screen, or held privately, depending on the mode.
3. They give a **hint**: any selection of one or more words from the Hint Bank, adding any number of new words first if there's room.
4. Every other player gets **one guess**, out loud.
5. Someone's right → the answer is tagged with that player and the next one comes up. Nobody's right → the hinter gives another hint.
6. After every answer is resolved, the finished board stays up to review, then the turn passes to the next hinter.

**Stuck on an answer?** The hinter can **reroll** it for a fresh random one, but each reroll permanently burns one of the 40 Hint Bank slots. Once the bank is full, the hinter can **end the turn**, forfeiting the rest. A full bank already scores `cutoff − 40` (on Regular, `25 − 40 = −15`), so a stalled turn is its own penalty.

## Scoring

- **Hinter:** `cutoff − (Hint Bank entries)`, where the cutoff comes from your difficulty (Regular is `25`). The less hint words and rerolls you have to use the more points you earn. Scores can go negative.
- **Guessers:** `+1` for every answer you personally land. Guessing more than once on a single hint costs `−1` per extra guess.

The hinter rotates so everyone hints once per **session**, and totals carry across the session. Highest score takes the crown!

## Tech

- **React + Vite + TypeScript**, plain CSS Modules, no backend.
- Light and dark themes, following your system setting by default and remembering your choice after that. The toggle works on every screen, including the randomizer.
- The rules live in a small, self-contained engine (`src/engine/`) that's edition-agnostic; it knows nothing about Pokémon or any other content.
- Editions are self-contained bundles: each declares its own categories, identity, and credits in `src/editions/`, with assets under `public/editions/<id>/`. Adding an edition is a drop-in, the same way adding a category is.
- Pokémon names and sprites are bundled locally under `public/editions/pokemon/`; the other categories are hand-curated bundled data.
- Static build, deployed via GitHub Pages.

## Running it

Run `npm install` first on a fresh checkout, then:

- `npm run dev` — play locally.
- `npm test` — run the engine tests.
- `npm run build` — produce the static build.

## Roadmap

The Pokémon edition is fully playable across three modes (In Person, Online: One Device, Online + Randomizer) and seven categories. The edition architecture is in place, with Geography, Books, and Marvel listed as "soon." Still ahead: building out those editions, full per-device online multiplayer (one screen per player, no passing), and more Pokémon categories (Professors and beyond).

## Credit

Credits are per-edition. The Pokémon edition is an unofficial, fan-made adaptation, not affiliated with Nintendo, Game Freak, or The Pokémon Company; its names and sprites belong to their respective owners, with data and sprites via PokéAPI. It began from a one-off video, "Guess The Pokemon But Use The FEWEST Hints!", which invited anyone to build a web version. Editions built from scratch (geography, books) carry their own credits, or none.
