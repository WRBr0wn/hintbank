### Hint Bank v1.0.0 - Pokémon Edition
The first public release of Hint Bank, a web adaptation of the hint-giving party game from "Guess The Pokémon But Use The FEWEST Hints!" (ZaneGames, Peebr, Cush & Lockstin). Built as a general party game that ships as editions — this release is Pokémon Edition, covering the full National Dex.
This is In Person: One Device mode — one phone or tablet acts as the smart board, rules engine, and scorekeeper while the group plays out loud, exactly like the original.

### How it plays
One player is the hinter with 10 secret answers, revealed one at a time. They get everyone else to guess using only words from a shared Hint Bank capped at 40 words for the whole game — a vocabulary budget that's reused across all 10 answers. Spend a slot on a sharp word now, or save it for later.

### What's in this release
Full game loop: setup, pass-to-hinter handoff, live play, per-turn summary, and a session leaderboard with rotation.
Faithful rules engine: 40-word hard cap, minimum-one-word hints, reroll (burns a bank slot, no skip), end-turn forfeit at a full bank, and scoring where the hinter earns 25 − bank entries − (5 if ended early) and can go negative.
Hint Bank color bands: slots shade green → yellow → orange → red as the bank fills, so the hinter can see their score draining toward zero at a glance.
Live scoreboard: a persistent bar shows every player's running total with a marker for the current hinter; guessers tick up the moment they land an answer.
Full National Dex: all 1,025 species, with sprites bundled locally.
Custom avatars: pick a Pokémon sprite or one of the original creators as your player icon.
Plays on any screen: single-device layout that scales from a phone up to a TV-sized display.

### Credit
Game concept by the creators of the original video. This is an unofficial, fan-made web adaptation.


### Hint Bank v2.0.0 - Modes & Discord Play
Hint Bank started as a single-device, in-person tool; this release turns it into a multi-mode party game you can run over Discord screen-share. Pick a mode at setup, and the app adapts how the secret answers are handled so they never leak onto a stream.

### Ways to play
Choose one at setup; it locks for the session.
- In Person: One Device - the original mode. Everyone's in the room, the hinter holds the phone or tablet and sees the answer on screen.
- Online: One Device - built for single page running with Discord screen-share. The app still deals the answers on the main page, but the current one stays covered until the hinter presses and holds to peek, so it never lands on the broadcast. Release to re-hide.
- Online: One Device + Randomizer - the most faithful to the original video. The shared screen is a fully public board (Hint Bank, results, scores). The hinter pulls answers from somewhere private, like the new built in separate page randomizer, and types each one in once it's guessed, so nothing secret ever touches the stream.

Online multiplayer (one screen per player) is on the roadmap for a potential future release.

### New: Randomizer page
A standalone [randomizer](https://wrbr0wn.github.io/hintbank/randomizer/) that draws Pokémon for the hinter, one at a time, up to a full turn of 10 - with name and sprite, no repeats. It opens in its own tab or on a second device and needs no connection to the game, so the hinter can pull their answers privately while the public board stays clean. In Randomizer mode, an "Open randomizer" button appears right where it's needed.

### Also in this release

Mode picker at setup, styled alongside the category toggles and locked for the session.
Stream-safe answer handling across both online modes, so the game is usable in a video and without trusting your friends to not peek.
The rules engine is untouched by all of this, every mode runs on the same scoring, Hint Bank, reroll, and rotation logic, with the mode only governing how answers are sourced and shown.

### Under the hood

Headless rules engine with full unit coverage; all tests green.
Multi-page static build (game + randomizer), deployed via GitHub Pages.
No backend, no new dependencies.

### Credit
Game concept by the creators of "Guess The Pokémon But Use The FEWEST Hints!" This is an unofficial, fan-made web adaptation.


### Hint Bank v2.3.0 - Gameplay Feel & Flow

A deep polish pass focused on how a turn actually plays, especially on a shared screen. One real rules change, plus a lot of board-feel and flow refinement.

### Rules change: ending a turn
Ending a turn early no longer costs an extra penalty. Your score is simply 25 − (Hint Bank entries). A full 40-word bank already scores 25 − 40 = −15, so a stalled turn is its own penalty - the old extra −5 on top of that was doubling down, and it's gone. (Ending early is still tracked, just not penalized.)

### A calmer, more deliberate board
- Hint words stay highlighted through the guess, so everyone can re-read the hint while thinking. When two or more words are picked, each shows a small order number, in case word order matters.
- Guess resolution is now a deliberate step. After giving a hint you get "Resolve Guess" and "Keep hinting" - the player list and scoring controls only appear when you choose to resolve, keeping the board clean during back-and-forth and off the shared screen until needed.
- The finished board stays up. When the last answer lands, the completed board (Hint Bank, the full landed list, and the scores) stays on screen to review, with the hinter's turn score revealed, until you continue. No more snapping straight to the next screen.

### Layout and sizing
- The "Who guessed it?" list and the Setup player list now split into two columns at higher player counts on desktop, so they don't push the scoreboard off-screen.
- The Landed list and the answer card are sized so the board fits without scrolling, even at four guessers.

### Smaller touches
- The randomizer page now carries the "Pokémon Edition" tag and a tidier, shorter instruction.
- The overguess button is now a compact "x2 (−1)".
- Cleaned up some stray characters in the source.


### Hint Bank v2.4.0 - Fixing Mistakes & Smoother Navigation
A quality-of-life release focused on recovering from slips and getting around the app, plus some display polish.

### Fix your typos
- Edit hint words. Misspelled a word or hit enter early? A new pencil in the Hint Bank header opens edit mode - tap a word to fix it. Correcting a word doesn't change your bank size or score, so it stays true to the one-way Hint Bank rule; you're just fixing what a slot says.
- Edit landed answers (Randomizer mode). When the host types in a guessed answer, it can now be corrected after the fact if it was mistyped, straight from the Landed list.
- Editing is built to be turned off for future competitive online play, so it can't be used to change hints or answers after the fact.

### Get back to setup without reloading
Click the "Hint Bank" title mid-game to return to setup. It asks first, and it keeps your players, so you can tweak the lineup or settings and start a fresh game without re-entering everyone.

### Display polish
- Hint words size themselves to fit. Long words shrink to stay readable instead of getting cut off, and only shrink as much as they need to - short words stay full size.
- Better mobile board. The Hint Bank and answer card now span the full width on phones, matching the rest of the board.


### Hint Bank v2.5.0 - Setup Settings & Accessibility

This release puts the game's difficulty in your hands. Before, every turn was a fixed 25-point cutoff over 10 answers; now you pick how hard and how long a turn runs at setup, and the scoring scales to match. Plus a category goes live and the modals get proper keyboard support.

### Tune the game at setup
- **Difficulty preset.** Pick Easy, Regular, or Hard. Each sets the hinter's starting cutoff for a full turn - 30, 25, or 20. Regular is the original 25, so nothing changes if you leave it alone.
- **Answers per turn.** Set how many answers a hinter holds, anywhere from 5 to 10, for shorter or longer turns.
- **The cutoff scales with turn length.** The preset is the cutoff for a full 10-answer turn; a shorter turn scales it down in proportion, so a 5-answer Regular turn isn't secretly easier than a 10-answer one. The Hint Bank is still a hard 40 words either way, cutoff determining how easily the hinter gets points.

### A truer fuel gauge
The Hint Bank's color bands now scale to your actual cutoff instead of the old fixed 25. Green, yellow, orange, then red as you spend toward the cutoff, with slots past it going grey for negative-score territory. A Regular game looks exactly like it always did; any other difficulty rescales the ramp so the colors always read true.

### New category: Badges
Gym Badges are now a live category you can pick at setup, alongside Pokémon, Gym Leaders, Towns & Cities, Games, Items, and Routes & Areas. That's seven categories live. Professors are still to come.

### Smoother return to setup
Clicking the title to go back to setup now keeps everything, not just your players - your mode, categories, difficulty, and answer count all come back exactly as you left them, so you can tweak one thing and start again.

### What's next at the end of a game
When a session wraps you now get three clear choices: Continue, Play Again, or Reset Session. Play Again keeps the same group but starts fresh scores and drops you back into setup, so you can change difficulty or categories between games without re-entering everyone.

### Accessibility
- **Keyboard-friendly modals.** The confirm and edit dialogs now trap focus while open, so Tab and Shift+Tab cycle inside the dialog instead of wandering off behind it. Focus moves into the dialog when it opens and returns to whatever you were on when it closes, and Escape still cancels.
- Both dialogs now carry an accessible name for screen readers.