# Hint Bank — Living Design Doc

**Status:** Planning complete for v1. No code written yet.
**Game:** Hint Bank · **v1 release:** Hint Bank — Pokémon Edition · **Repo:** `hintbank`
**Owner:** ZenVolka
**Purpose:** Single source of truth for the web adaptation of the YouTuber's Google-Slides + Discord party game. Diff against this as the build evolves to prevent drift.

---

## 1. Concept

A hint-giving party game for **2–8 players**. One player (the **hint giver**) holds a private list of 10 secret answers and must get the other players to guess each one, using only words drawn from a shared, append-only **Hint Bank**. The original was run manually over Google Slides (public board) + Discord (voice) + a private Google Sheet (the giver's answer list).

The core tension: the Hint Bank is a **fixed vocabulary budget of 40 words for the entire game**, reused across all 10 answers. Spend a slot on a sharp word now, or conserve it for later answers.

**Hint Bank is a general party game that ships as editions** — the engine is category-agnostic; a future edition is just a different bundled dataset behind the same rules. v1 ships as **Pokémon Edition**.

---

## 2. Roles & flow (one game = one giver's full list of 10)

1. One player is the **hint giver**. The other players are **guessers**.
2. The giver receives **10 secret answers**, revealed **one at a time** (giver sees only the current answer).
3. The game proceeds in **rounds**. Each round:
   - The giver gives a **hint**: any **non-empty subset** of words currently in the Hint Bank. They may first **add** new word(s) to the bank (subject to the cap), then use any subset.
   - Each **other player** gets **one guess**.
   - **Correct** → the answer is placed in the result list, tagged with the **guesser's** avatar; the **next** answer is revealed.
   - **No one correct** → the giver gives another hint (same words, different subset, or newly added words). Repeat.
4. After all 10 answers are resolved (each guessed, or forfeited via End Turn), the game ends and scores are tallied.

---

## 3. The Hint Bank

- Append-only, **shared across all 10 answers** in a game (does not reset between answers).
- **Hard cap: 40 words.** Once the bank holds 40 words, **no new words may be added** — hints must be drawn from existing words only. UI must **prevent** adding past 40 (disabled "add" + "bank full" state), not allow-then-error.
- Every hint must use **at least one** word from the bank. Zero-word hints are invalid.
- A hint may reuse any subset of banked words, freely, regardless of whether words were just added this round.

---

## 4. Reroll & End Turn (escape hatches)

There is no "skip." Two mechanisms handle answers the giver can't land:

**Reroll** — available whenever the bank has at least one free slot (< 40).
- Discards the current answer (drawn-without-replacement; it does not return to the pool) and reveals a **new random** answer in the same slot.
- You **still have to land it** — reroll keeps you going, it is not "skip and move on." It does not reduce the number of answers you must resolve.
- **Cost: one bank slot.** A non-usable **`reroll` marker** is placed in the next slot, occupying it toward the 40 cap. The marker **cannot be selected as a hint word**. This shrinks the giver's usable vocabulary and pushes the bank toward full.
- **Point cost: −1**, like any bank entry — the `reroll` marker occupies a slot, and the giver's score deducts every slot (see §5). The cost is no longer just lost capacity. Reroll still does **not** count as a hint.

**End Turn** — available **only once the bank is full (40)**, i.e. when the giver can neither add a word nor reroll.
- Ends the giver's turn: all remaining unresolved answers are forfeited (awarded to nobody), and the giver takes a single flat **−5**.
- At 40 the giver may instead keep giving hints from their existing 40 words indefinitely; End Turn is an option, never forced.

**No deadlock:** below 40 the giver can always reroll; at 40 the giver can always End Turn or keep hinting.

---

## 5. Scoring

Per game:

- **Hint giver:** `25 − (number of entries in the hint bank) − (5 if the turn was ended early)`. Every occupied slot counts — both added words **and** `reroll` markers — so each reroll costs **−1** (the slot it fills). The number of hints given does **not** affect the score.
- **Guesser:** `+1` per answer they personally guessed correctly.
- **Overguess penalty:** if a guesser guesses more than once for a single hint, `−1` per extra guess. (Verbal mode: applied via the giver's judgment / a −1 button.)
- **All scores can go negative.** No floor on giver score or guesser score.

A "hint" = one round / one hint announcement (not per word). It's a round counter shown to the giver and **does not feed scoring** — only bank size does.

---

## 6. Session structure

- A **session** = one full **rotation** (each player is hint giver exactly once). Totals accumulate across games, like the running tally at the bottom of the board.
- **Settings/category toggles are locked** for the entire session (chosen at session start).
- After a rotation completes, players choose:
  - **Continue** — start another rotation, keeping current point totals. Settings stay locked.
  - **Start over** — reset totals; settings may be changed.
- Session leaderboard shows the running totals; leader gets the crown.

---

## 7. v1 scope — Mode A (single-device game-master tool)

The hint giver physically holds the device for their turn. Because guessers never look at the giver's screen, the (normally public) Hint Bank being visible only to the giver is acceptable for v1. Hints and guesses happen **verbally**, exactly like the Discord original; the app is the smart board + rules engine + scorekeeper.

**Screens / states:**

1. **Setup** — add 2–8 players (name + avatar), choose categories (v1: Pokémon only), confirm answers-per-game = 10. Settings lock on start.
2. **Pass-to-giver** — interstitial so the next giver can take the device privately before answers show.
3. **Giver play screen:**
   - Current secret answer (1 of 10), with progress.
   - Hint Bank grid (up to 40), with **add word** (disabled at 40) and subset selection.
   - **Give hint** → increments round/hint count.
   - **Resolve:** which player guessed correctly (tag + advance), or **no one** (continue hinting), plus **overguess −1** control per guesser.
   - **Reroll** (enabled while bank < 40): swaps the current answer for a new random one and drops a non-usable `reroll` marker into the next bank slot.
   - **End Turn** (enabled only at bank = 40): −5, ends the turn.
4. **Game summary** — giver `25 − bank entries − (5 if ended early)`; each guesser's count; per-game deltas.
5. **Rotation handling** — advance to next giver until rotation complete.
6. **Session leaderboard** — running totals + crown; **continue / start over** prompt.

This loop produces every asset and mechanic the later modes reuse.

---

## 8. Data plan (v1)

- Lists are **bundled as static JSON** at build time (artifacts/static sites can't reliably fetch at runtime). Baked in, not live — fine, since these lists are stable.
- **Pokémon source:** PokéAPI (pokeapi.co) is **not reachable** from the build container (not allowlisted). Use the **PokéAPI GitHub mirror via `raw.githubusercontent.com`** (allowed) to pull the full National Dex (~1025 species). Sprite paths come from the same mirror if/when we add sprites.
- v1 ships **Pokémon only** (Pokémon Edition). Category toggles exist in the UI but only Pokémon is populated to start.
- Answers shown to the giver as **plain text names**; the result column is text + guesser avatar (no sprites for v1).

---

## 9. Deferred (later modes & editions)

- **Mode B — public second screen:** a TV/laptop in the room shows the live public board (Hint Bank, result list, scores) while the giver uses a private screen. Requires a realtime sync layer → hosted project, not a static page.
- **Mode C — pass-and-play single screen:** hold-to-reveal + pass the device for in-app guessing. Strict rule enforcement, but lots of passing.
- **Mode D — full multiplayer:** one device per player, rooms, realtime sync, automatic per-player guessing & penalty enforcement, scales to 8. Largest build (backend + hosting).
- **More Pokémon-Edition categories:** items, gym leaders, towns, gym badges, professors. No single clean API like PokéAPI; expect a mix of GitHub-hosted datasets + hand-curation. Each becomes a togglable category.
- **Future editions:** different bundled datasets behind the same engine (the reason the engine is category-agnostic).
- **Sprites / flavor art** for answers and the result column.

---

## 10. Open / to-revisit

- Exact tuning of the 40-cap, the −5 end-turn penalty, and the −1 overguess once playtested.
- Naming/curation conventions for the non-Pokémon categories (deferred with those modes).

---

## Changelog

- **v0.5** — Corrected giver scoring to `25 − (hint-bank entries) − (5 if ended early)`: the deduction is total bank size — added words **and** reroll markers — not the number of hints given. Consequence: a reroll now costs **−1** (the slot it fills), retiring the earlier "reroll has no direct point cost" framing. `hintCount` survives only as a UI round counter.
- **v0.4** — Locked **End Turn = (A)**: forfeits all remaining answers, single flat −5. Confirmed Pokémon pool = full National Dex (~1025), no curation toggle for v1. Removed stale "skip" wording.
- **v0.3** — Replaced **Skip** with **Reroll** (swap current answer for a new one; cost = one bank slot filled with a non-usable `reroll` marker; no point penalty; still must land it) and **End Turn** (only at bank=40; −5; ends the turn). Updated giver scoring to `25 − hints − (5 if ended early)`. Matches the source video's reroll mechanic.
- **v0.2** — Named the game **Hint Bank** (v1 = Pokémon Edition); repo `hintbank`. Framed as a general party game shipping as editions.
- **v0.1** — Initial spec from planning conversation. Rules finalized: 40-word hard cap, min one word per hint, always-available skip at −5, all scores can go negative, settings locked per session, continue-or-reset after rotation. v1 = Mode A, Pokémon-only, data via PokéAPI GitHub mirror.
