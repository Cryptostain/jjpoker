# Side Pots

A calculator for splitting multi-way all-in pots at a live tournament table.

You know the situation: three people are all in for different amounts, one of them
folded earlier with chips already in, and now everyone is staring at the felt trying
to work out who is eligible for what. This does that part.

It does not know your cards, your stack, or who is sitting where. You tell it what
each player put in; it tells you how the pot splits and who can win each piece.

---

## Using it at the table

The whole app is one scrolling page.

**1. Levels.** Three tiles at the top: small blind, big blind, ante. Tap one to
edit it with the keypad. These change constantly in hyper turbos, so they sit up
front rather than buried in settings.

**2. Streets.** Preflop is open by default. For each player, tap their row and type
what they put in *on that street*. Their running total for the hand shows underneath.

- **Call** fills in whatever is needed to match the largest total, then jumps to the next player.
- **Fold** marks them out. Their chips stay in the pot — they just can't win any of it.
- **All in** flags them as having nothing left. From then on the keypad locks for
  them, `Next` skips over them, and new streets stop asking them for money.
- **+ SB** and **+ BB** add a blind-sized amount, for posting blinds by hand.
- **Clear P2** wipes that player's whole entry across every street.

Tap `+ Flop` to open the next street. When fewer than two players can still act,
that button disappears and the app says *Everyone's committed*.

**3. Pots.** Updates live. Each pot shows its size and exactly who is in it. Tap a
name to mark the winner. Tap two names for a chop.

**4. Payout.** Also live. Each winner gets a card showing what they take, broken
down by which pot it came from, plus their net for the hand. If a split doesn't
divide into whole chips, an amber card flags the leftover and you settle it at the
table.

`New hand` empties everything and keeps the players and levels.

---

## Antes

Antes are never typed in per player — they're always in the pot. Two modes in
settings:

- **One per hand** (default): a single ante for the whole table, which is what a
  big-blind ante amounts to. It goes into the main pot as dead money. Because the
  app doesn't track position, it isn't charged to any particular player, so it won't
  show up in anyone's net line.
- **One per player**: every seat is charged the ante. This *is* attributed, so nets
  are exact.

---

## The rules it follows

- Side pots depend only on the **total** each player committed. Streets, bet order,
  and raise sizing are irrelevant to the math — they're bookkeeping so you can see
  what happened.
- Chips from folded players feed every pot layer they reached. They just aren't
  eligible to win any of it.
- If one player committed more than anyone else could match, the unmatched excess is
  returned to them rather than forming a pot.
- Split pots round down to the smallest chip in play (set in settings). Anything
  left over is reported, not silently assigned — there's no dealer button here, so
  the app has no basis for deciding who gets the odd chip.

## What it deliberately doesn't do

No stack tracking, no seat positions, no dealer button, no card input, no bounties,
no hand history between hands. Each hand is entered fresh. Every one of those was
considered and cut to keep the thing usable one-handed with a phone at a table.

`All in` is a manual flag for this reason — detecting it automatically would require
knowing everyone's stack.

---

## Running it

Single React component, no backend, no dependencies beyond React itself. All state
is in memory; nothing is persisted.

```
npm create vite@latest sidepots -- --template react
cd sidepots
# drop the component in as src/App.jsx
npm install
npm run dev
```

## Putting it on a phone

Deploy the built `dist/` to GitHub Pages, Cloudflare Pages, or Netlify — all free,
all static, no server to run. Then add a web app manifest and a service worker and
it installs to the home screen and runs offline. Once cached it never touches the
network again; the app is pure client-side arithmetic.

An APK is possible by wrapping the same code in Capacitor if you ever want one, but
it isn't necessary — the hosted version works on iPhones too, and sideloaded APKs
have no update path.

## Layout

```
README.md      this file
CLAUDE.md      context for AI coding agents
src/App.jsx    the entire application
```
