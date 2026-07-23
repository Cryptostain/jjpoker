# Side Pots

A simple calculator for splitting poker pots when players go all-in for
different amounts.

You know the moment: three people are all-in for different amounts, someone
folded earlier with chips already in the middle, and now everyone's staring at
the table trying to figure out who can win what. This app does that math for you.

It doesn't know your cards or your chip stack. You just tell it what each player
put in, and it tells you how the pot splits and who's eligible for each piece.

---

## How to use it

The whole thing is one page you scroll down. There's a keypad at the bottom for
typing numbers.

**1. Set the blinds.** At the top are three tiles: small blind, big blind, and
ante. Tap one and type the amount.

**2. Enter what each player put in.** Tap a player's row, then type how much they
bet. Handy buttons:

- **Call** — fills in the amount needed to match the biggest bet, then moves to
  the next player.
- **Fold** — marks a player as folded. Their chips stay in the pot, but they
  can't win it.
- **All in** — marks a player as having no chips left.
- **Clear** — wipes that player's entry.

Tap **+ Flop** to move to the next round of betting.

**3. Pick the winner.** As you enter bets, the app shows each pot and who's in it.
Tap a name to mark them the winner. Tap two names if the pot is split.

**4. See the payout.** The app shows exactly how much each winner takes and where
it came from. If a split doesn't come out to whole chips, it flags the odd chip so
you can settle it at the table.

When the hand's over, tap **New hand** to clear everything and start fresh. Your
players and blind amounts stay.

---

## A few things to know

- The math only cares about the **total** each player put in — not the order they
  bet or the round it happened in.
- Chips from folded players stay in the pot. They just can't win it.
- If one player bet more than anyone else could match, the extra is given back to
  them instead of going into a pot.
- The app doesn't track chip stacks or seats, so **All in** and **Fold** are things
  you tap yourself.

---

## How to run it

This app is a small piece of software that runs in a web browser. To use it, you
need to put it online (this is called "hosting"). Here's the easy way — no coding
required:

1. **Make a free account** at [Netlify](https://www.netlify.com) or
   [Vercel](https://vercel.com). Both are free and made for exactly this.

2. **Connect it to this project** on GitHub. When you sign up, they'll ask to link
   your GitHub account — pick this repository (`jjpoker`) from the list.

3. **Click deploy.** They build it and give you a web link (like
   `your-app.netlify.app`) in about a minute.

4. **Open the link on your phone.** In your phone's browser menu, tap **Add to Home
   Screen**. Now it works like a normal app — even offline, with no internet.

That's it. Once it's set up, you never have to touch it again.

> **Note for developers:** it's a single React component (`jjpoker.jsx`) with no
> backend and no dependencies beyond React. Drop it into a Vite React project as
> `src/App.jsx`, run `npm install && npm run build`, and deploy the `dist/` folder.

---

## What's in this project

```
README.md      this file — how to use and set up the app
jjpoker.jsx    the app itself
```
