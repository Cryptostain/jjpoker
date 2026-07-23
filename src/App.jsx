import { useState, useMemo, useEffect } from "react";

/* ── look ───────────────────────────────────────────────── */
const C = {
  bg: "#0F1214",
  card: "#191E21",
  key: "#222A2D",
  line: "#2C3538",
  text: "#F2F0EC",
  dim: "#7F8D91",
  go: "#4FB286",
  no: "#D0543F",
  warn: "#D9A441",
  allin: "#4A9BD4",
};
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const num = { fontFamily: MONO, fontVariantNumeric: "tabular-nums" };
const STREETS = ["Preflop", "Flop", "Turn", "River"];

/* ── math ───────────────────────────────────────────────── */
const N = (s) => {
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};
const F = (n) => (n || 0).toLocaleString("en-US");
const applyKey = (s, k) => {
  if (k === "del") return s.slice(0, -1);
  if (k === "00") return s ? s + "00" : "";
  return (s + k).replace(/^0+(?=\d)/, "");
};

function computePots(players, deadExtra) {
  const sorted = players.map((p) => p.chips).sort((a, b) => b - a);
  const max = sorted[0] || 0;
  const second = sorted[1] || 0;
  const eff = new Map(players.map((p) => [p.id, p.chips]));
  let refund = null;

  const top = players.filter((p) => p.chips === max && max > 0);
  if (top.length === 1 && max > second) {
    refund = { id: top[0].id, amount: max - second };
    eff.set(top[0].id, second);
  }

  const live = players.filter((p) => !p.folded && eff.get(p.id) > 0);
  const levels = [...new Set(live.map((p) => eff.get(p.id)))].sort((a, b) => a - b);

  const pots = [];
  let prev = 0;
  for (const L of levels) {
    let amount = 0;
    for (const p of players) {
      const c = eff.get(p.id);
      amount += Math.min(c, L) - Math.min(c, prev);
    }
    const eligible = live.filter((p) => eff.get(p.id) >= L).map((p) => p.id);
    if (amount > 0) pots.push({ amount, eligible });
    prev = L;
  }
  let dead = 0;
  for (const p of players) {
    const c = eff.get(p.id);
    if (c > prev) dead += c - prev;
  }
  if (dead > 0 && pots.length) pots[pots.length - 1].amount += dead;

  if (deadExtra > 0) {
    if (pots.length) pots[0].amount += deadExtra;
    else {
      const inHand = players.filter((p) => !p.folded).map((p) => p.id);
      if (inHand.length) pots.push({ amount: deadExtra, eligible: inHand });
    }
  }
  return { pots, refund };
}

function split(amount, winners, chipSize) {
  const step = Math.max(1, chipSize);
  if (!winners.length) return { shares: {}, leftover: 0 };
  const per = Math.floor(amount / winners.length / step) * step;
  const shares = {};
  winners.forEach((id) => (shares[id] = per));
  return { shares, leftover: amount - per * winners.length };
}

/* ── app ────────────────────────────────────────────────── */
let uid = 0;
const mk = (i) => ({ id: `s${uid++}`, name: `P${i}`, bets: ["", "", "", ""], foldedAt: null, allInAt: null });
const wipe = (s) => ({ ...s, bets: ["", "", "", ""], foldedAt: null, allInAt: null });

// Post the blinds preflop: first seat = SB, second seat = BB. Returns a new array.
const postBlinds = (arr, sb, bb) =>
  arr.map((s, i) => {
    if (i > 1) return s;
    const v = i === 0 ? sb : bb;
    return { ...s, bets: s.bets.map((b, k) => (k === 0 ? String(N(v)) : b)) };
  });

export default function App() {
  const [sb, setSb] = useState("100");
  const [bb, setBb] = useState("200");
  const [seats, setSeats] = useState(() => postBlinds([mk(1), mk(2), mk(3)], "100", "200"));
  const [ante, setAnte] = useState("200");
  const [anteMode, setAnteMode] = useState("table"); // table | each | off
  const [linked, setLinked] = useState(true);
  const [chipSize, setChipSize] = useState("25");

  const [streets, setStreets] = useState(1);
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState({ kind: "seat", id: null });
  const [picks, setPicks] = useState({});
  const [sheet, setSheet] = useState(false);
  const [pad, setPad] = useState(true);

  useEffect(() => { if (linked) setAnte(bb); }, [bb, linked]);
  useEffect(() => { if (!target.id) setTarget({ kind: "seat", id: seats[0].id }); }, []);

  /* ante */
  const anteEach = anteMode === "each" ? N(ante) : 0;
  const anteLump = anteMode === "table" ? N(ante) : 0;
  const anteTotal = anteMode === "each" ? N(ante) * seats.length : anteLump;

  /* derived */
  const betsOf = (s) => s.bets.reduce((a, b) => a + N(b), 0);
  const committedOf = (s) => betsOf(s) + anteEach;
  const isOut = (s) => s.foldedAt !== null;
  const isShoved = (s) => s.allInAt !== null;
  const canAct = (s) => !isOut(s) && !isShoved(s);

  const players = seats.map((s) => ({ id: s.id, chips: committedOf(s), folded: isOut(s) }));
  const name = (id) => seats.find((s) => s.id === id)?.name ?? "?";
  const { pots, refund } = useMemo(
    () => computePots(players, anteLump),
    [JSON.stringify(players), anteLump]
  );
  const middle = players.reduce((a, p) => a + p.chips, 0) + anteLump;
  const highest = Math.max(0, ...seats.map(betsOf));
  const streetTotal = (i) => seats.reduce((a, s) => a + N(s.bets[i]), 0);

  const stillBetting = seats.filter(canAct).length;
  const canContinue = (active < streets - 1 || streets < 4) && stillBetting >= 2;

  const sig = (p) => [...p.eligible].sort().join("|");
  const won = (p) => (p.eligible.length === 1 ? p.eligible : (picks[sig(p)] || []).filter((x) => p.eligible.includes(x)));
  const anyWinner = pots.some((p) => won(p).length);

  const payout = useMemo(() => {
    const collects = {}, detail = {}, odds = [];
    pots.forEach((p, i) => {
      const { shares, leftover } = split(p.amount, won(p), N(chipSize));
      Object.entries(shares).forEach(([k, v]) => {
        collects[k] = (collects[k] || 0) + v;
        (detail[k] = detail[k] || []).push({ pot: i, amount: v, shared: won(p).length > 1 });
      });
      if (leftover > 0) odds.push({ pot: i, amount: leftover });
    });
    if (refund) {
      collects[refund.id] = (collects[refund.id] || 0) + refund.amount;
      (detail[refund.id] = detail[refund.id] || []).push({ pot: -1, amount: refund.amount });
    }
    return { collects, detail, odds };
  }, [pots, picks, refund, chipSize]);

  /* actions */
  const edit = (id, fn) => setSeats((s) => s.map((x) => (x.id === id ? fn(x) : x)));
  const setBet = (id, v) => edit(id, (x) => ({ ...x, bets: x.bets.map((b, i) => (i === active ? v : b)) }));
  const tSeat = seats.find((s) => s.id === target.id);

  const press = (k) => {
    if (target.kind === "sb") return setSb((v) => applyKey(v, k));
    if (target.kind === "bb") return setBb((v) => applyKey(v, k));
    if (target.kind === "ante") { setLinked(false); return setAnte((v) => applyKey(v, k)); }
    if (!tSeat || !canAct(tSeat)) return;
    setBet(tSeat.id, applyKey(tSeat.bets[active], k));
  };
  const advance = (fromId) => {
    const i = seats.findIndex((s) => s.id === fromId);
    for (let k = 1; k <= seats.length; k++) {
      const nx = seats[(i + k) % seats.length];
      if (canAct(nx)) return setTarget({ kind: "seat", id: nx.id });
    }
  };
  const pick = (s) => { setTarget({ kind: "seat", id: s.id }); setPad(true); };
  const nextSeat = () => target.kind === "seat" && advance(target.id);
  const toggleFold = () => {
    if (target.kind !== "seat") return;
    edit(target.id, (x) => ({ ...x, foldedAt: x.foldedAt === null ? active : null, allInAt: null }));
    advance(target.id);
  };
  const toggleAllIn = () => {
    if (target.kind !== "seat" || !tSeat) return;
    const flag = tSeat.allInAt === null;
    edit(tSeat.id, (x) => ({ ...x, allInAt: flag ? active : null, foldedAt: null }));
    if (flag) advance(tSeat.id);
  };
  const call = () => {
    if (target.kind !== "seat" || !tSeat || !canAct(tSeat)) return;
    const others = betsOf(tSeat) - N(tSeat.bets[active]);
    setBet(tSeat.id, String(Math.max(0, highest - others)));
    advance(tSeat.id);
  };
  const clearTarget = () => {
    if (target.kind === "sb") return setSb("");
    if (target.kind === "bb") return setBb("");
    if (target.kind === "ante") { setLinked(false); return setAnte(""); }
    if (tSeat) edit(tSeat.id, wipe);
  };

  const addSeat = () => seats.length < 10 && setSeats((s) => [...s, mk(s.length + 1)]);
  const dropSeat = () => seats.length > 3 && setSeats((s) => s.slice(0, -1));

  const nextStreet = () => {
    let idx;
    if (active < streets - 1) idx = active + 1;
    else { idx = streets; setStreets(streets + 1); }
    setActive(idx);
    const first = seats.find(canAct);
    if (first) pick(first);
  };
  const newHand = () => {
    setSeats((s) => postBlinds(s.map(wipe), sb, bb));
    setStreets(1); setActive(0); setPicks({}); setPad(true);
    setTarget({ kind: "seat", id: seats[0].id });
  };

  const tLabel = target.kind === "sb" ? "small blind" : target.kind === "bb" ? "big blind"
    : target.kind === "ante" ? "ante" : `${tSeat?.name ?? ""} · ${STREETS[active]}`;
  const locked = target.kind === "seat" && tSeat && !canAct(tSeat);

  /* ── settings ── */
  if (sheet)
    return (
      <Shell>
        <div style={{ padding: "18px 18px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setSheet(false)} style={{ background: "none", border: "none", color: C.dim, fontSize: 26, cursor: "pointer", padding: 0 }}>‹</button>
            <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>Settings</h1>
          </div>

          <p style={{ color: C.dim, fontSize: 13, margin: "0 0 8px" }}>Ante — always added to the pot</p>
          <div style={{ display: "flex", gap: 7 }}>
            {[["table", "One per hand"], ["each", "One per player"], ["off", "No ante"]].map(([k, t]) => (
              <button key={k} onClick={() => setAnteMode(k)} style={{
                flex: 1, padding: "13px 4px", fontSize: 13, borderRadius: 11, border: "none", cursor: "pointer",
                background: anteMode === k ? C.go : C.card, color: anteMode === k ? C.bg : C.dim, fontWeight: anteMode === k ? 700 : 500,
              }}>{t}</button>
            ))}
          </div>
          <p style={{ color: C.dim, fontSize: 12, margin: "8px 2px 0" }}>
            One per hand suits big-blind antes. One per player charges every seat.
          </p>

          <p style={{ color: C.dim, fontSize: 13, margin: "26px 0 6px" }}>Smallest chip in play</p>
          <input value={chipSize} inputMode="numeric" onChange={(e) => setChipSize(e.target.value.replace(/[^\d]/g, ""))}
            style={{ width: "100%", background: C.card, border: "none", borderRadius: 11, color: C.text, fontSize: 17, padding: "13px 15px", ...num }} />
          <p style={{ color: C.dim, fontSize: 12, margin: "8px 2px 0" }}>Split pots round down to this. Anything left over is flagged.</p>

          <p style={{ color: C.dim, fontSize: 13, margin: "26px 0 8px" }}>Names</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {seats.map((s) => (
              <input key={s.id} value={s.name} onChange={(e) => edit(s.id, (x) => ({ ...x, name: e.target.value }))}
                style={{ background: C.card, border: "none", borderRadius: 11, color: C.text, fontSize: 16, padding: "13px 15px", fontFamily: SANS }} />
            ))}
          </div>

          <div style={{ marginTop: 26 }}>
            <button onClick={() => setSheet(false)} style={{
              width: "100%", padding: 16, borderRadius: 14, border: "none",
              background: C.go, color: C.bg, fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>Done</button>
          </div>
        </div>
      </Shell>
    );

  const takers = seats.filter((s) => payout.collects[s.id] > 0);

  /* ── one page ── */
  return (
    <Shell>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* level bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 18px 0" }}>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, flex: 1, letterSpacing: "-0.02em" }}>Side pots</h1>
          <button onClick={() => setSheet(true)} style={{ background: C.card, border: "none", color: C.dim, borderRadius: 11, padding: "10px 14px", fontSize: 18, cursor: "pointer" }}>⚙</button>
        </div>

        <div style={{ display: "flex", gap: 7, padding: "12px 18px 0" }}>
          <Tile kind="sb" label="Small blind" value={sb} target={target} setTarget={setTarget} />
          <Tile kind="bb" label="Big blind" value={bb} target={target} setTarget={setTarget} />
          {anteMode !== "off" && <Tile kind="ante" label="Ante" value={ante} target={target} setTarget={setTarget} />}
        </div>
        {anteMode !== "off" && (
          <p style={{ color: C.dim, fontSize: 12, margin: "8px 18px 0" }}>
            <span style={{ ...num, color: C.text }}>{F(anteTotal)}</span> in antes goes into the main pot automatically
            {anteMode === "each" ? " — one per player." : " — one for the table."}
          </p>
        )}

        {/* streets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "18px 18px 0" }}>
          {Array.from({ length: streets }, (_, si) => {
            const open = si === active;
            return (
              <div key={si} style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setActive(si)} style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: C.text,
                }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: open ? C.go : C.text }}>{STREETS[si]}</span>
                  <span style={{ ...num, fontSize: 15, color: C.dim }}>{F(streetTotal(si))} {open ? "▾" : "▸"}</span>
                </button>
                {open && (
                  <div style={{ padding: "0 10px 10px" }}>
                    {seats.map((s) => {
                      const on = target.kind === "seat" && s.id === target.id;
                      const gone = isOut(s) && s.foldedAt <= si;
                      const shoved = isShoved(s) && s.allInAt <= si;
                      return (
                        <button key={s.id} onClick={() => pick(s)} style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px", marginTop: 4, borderRadius: 10, cursor: "pointer", textAlign: "left",
                          background: on ? C.key : "transparent", border: `2px solid ${on ? C.go : "transparent"}`,
                        }}>
                          <span>
                            <span style={{ fontSize: 15, fontWeight: 600, color: gone ? C.dim : C.text }}>{s.name}</span>
                            <span style={{ display: "block", fontSize: 12, color: gone ? C.no : C.dim, marginTop: 2, ...num }}>
                              {F(committedOf(s))} total{gone && committedOf(s) > 0 ? " — stays in the pot" : ""}
                            </span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            {gone && <span style={tag(C.no)}>FOLDED</span>}
                            {shoved && !gone && <span style={tag(C.allin)}>ALL IN</span>}
                            <span style={{ ...num, fontSize: 21, fontWeight: 600, color: gone ? C.dim : N(s.bets[si]) ? C.text : C.dim }}>
                              {F(N(s.bets[si]))}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {canContinue && (
            <button onClick={nextStreet} style={{
              padding: "14px 0", background: "none", border: `1px dashed ${C.line}`, borderRadius: 13,
              color: C.dim, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              + {active < streets - 1 ? STREETS[active + 1] : STREETS[streets]}
            </button>
          )}
          {!canContinue && stillBetting < 2 && (
            <p style={{ color: C.allin, fontSize: 13, textAlign: "center", margin: "2px 0" }}>
              Everyone's committed — no more betting.
            </p>
          )}

          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={dropSeat} disabled={seats.length <= 3} style={stepBtn(seats.length <= 3)}>− Player</button>
            <button onClick={addSeat} disabled={seats.length >= 10} style={stepBtn(seats.length >= 10)}>+ Player</button>
          </div>
        </div>

        {/* pots */}
        <div style={{ padding: "26px 18px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pots</h2>
            <span style={{ fontSize: 14, color: C.dim }}>
              in the middle <span style={{ ...num, color: C.text, fontWeight: 700 }}>{F(middle)}</span>
            </span>
          </div>

          {pots.length === 0 && (
            <p style={{ color: C.dim, fontSize: 14, margin: 0 }}>Nothing in yet. Enter what each player put in above.</p>
          )}

          {pots.map((p, i) => {
            const w = won(p);
            const lock = p.eligible.length === 1;
            return (
              <div key={i} style={{ background: C.card, borderRadius: 14, padding: "15px 16px 13px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{i === 0 ? "Main pot" : `Side pot ${i}`}</span>
                  <span style={{ ...num, fontSize: 23, fontWeight: 700 }}>{F(p.amount)}</span>
                </div>
                <p style={{ color: C.dim, fontSize: 13, margin: "4px 0 11px" }}>
                  In this pot: {p.eligible.map(name).join(", ")}{i > 0 && " — nobody else put in this much"}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {p.eligible.map((id) => {
                    const hit = w.includes(id);
                    return (
                      <button key={id} onClick={() => !lock && setPicks((x) => {
                        const cur = x[sig(p)] || [];
                        return { ...x, [sig(p)]: cur.includes(id) ? cur.filter((y) => y !== id) : [...cur, id] };
                      })} style={{
                        padding: "11px 16px", borderRadius: 11, border: "none", fontSize: 14,
                        cursor: lock ? "default" : "pointer",
                        background: hit ? C.go : C.key, color: hit ? C.bg : C.dim, fontWeight: hit ? 700 : 500,
                      }}>{name(id)}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {refund && (
            <p style={{ color: C.dim, fontSize: 13, margin: "2px 2px 0" }}>
              <span style={{ ...num, color: C.text }}>{F(refund.amount)}</span> goes straight back to {name(refund.id)} — nobody matched it.
            </p>
          )}
        </div>

        {/* payout */}
        <div style={{ padding: "26px 18px 0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Payout</h2>
          {!anyWinner && (
            <p style={{ color: C.dim, fontSize: 14, margin: 0 }}>Tap a winner on each pot above.</p>
          )}

          {takers.map((s) => (
            <div key={s.id} style={{ background: C.card, borderRadius: 14, padding: 17, marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: C.dim, marginBottom: 3 }}>{s.name} takes</div>
              <div style={{ ...num, fontSize: 34, fontWeight: 700, lineHeight: 1, color: C.go }}>{F(payout.collects[s.id])}</div>
              <div style={{ marginTop: 11, borderTop: `1px solid ${C.line}`, paddingTop: 9 }}>
                {(payout.detail[s.id] || []).map((d, k) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dim, paddingTop: k ? 5 : 0 }}>
                    <span>{d.pot === -1 ? "Returned, unmatched" : d.pot === 0 ? "Main pot" : `Side pot ${d.pot}`}{d.shared ? " (split)" : ""}</span>
                    <span style={{ ...num, color: C.text }}>{F(d.amount)}</span>
                  </div>
                ))}
                <div style={{ ...num, fontSize: 13, color: C.dim, marginTop: 8 }}>
                  net {payout.collects[s.id] - committedOf(s) >= 0 ? "+" : ""}{F(payout.collects[s.id] - committedOf(s))}
                </div>
              </div>
            </div>
          ))}

          {payout.odds.map((o) => (
            <div key={o.pot} style={{ border: `1px solid ${C.warn}`, borderRadius: 14, padding: "13px 16px", marginBottom: 8 }}>
              <div style={{ color: C.warn, fontSize: 14, fontWeight: 600 }}>
                {F(o.amount)} left over on the {o.pot === 0 ? "main pot" : `side pot ${o.pot}`}
              </div>
              <div style={{ color: C.dim, fontSize: 13, marginTop: 3 }}>Doesn't divide evenly. Settle it at the table.</div>
            </div>
          ))}

          {anyWinner && (
            <div style={{ background: C.card, borderRadius: 14, overflow: "hidden", marginTop: 4 }}>
              {seats.filter((s) => !payout.collects[s.id]).map((s, i) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 14 }}>
                  <span style={{ color: C.dim }}>{s.name}</span>
                  <span style={{ ...num, color: committedOf(s) ? C.no : C.dim }}>{committedOf(s) ? `−${F(committedOf(s))}` : "0"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "24px 18px 30px" }}>
          <button onClick={newHand} style={{
            width: "100%", padding: 15, borderRadius: 14, border: `1px solid ${C.line}`,
            background: "transparent", color: C.text, fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>New hand</button>
        </div>
      </div>

      {/* keypad */}
      <div style={{ borderTop: `1px solid ${C.line}`, padding: "8px 10px 12px", background: C.bg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 8px", gap: 8 }}>
          <button onClick={() => setPad((v) => !v)} style={{
            background: "none", border: "none", color: C.dim, fontSize: 14, cursor: "pointer",
            padding: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, textAlign: "left",
          }}>
            {pad ? "▾ " : "▸ "}
            {locked ? `${tSeat.name} is ${isOut(tSeat) ? "out" : "all in"}` : <>Typing <b style={{ color: C.text }}>{tLabel}</b></>}
          </button>
          {pad && (target.kind !== "seat" || tSeat) && (
            <button onClick={clearTarget} style={{ background: "none", border: `1px solid ${C.line}`, color: C.no, borderRadius: 9, padding: "6px 11px", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
              Clear {target.kind === "sb" ? "SB" : target.kind === "bb" ? "BB" : target.kind === "ante" ? "ante" : tSeat.name}
            </button>
          )}
        </div>

        {pad && (
          <>
            {target.kind === "seat" && !locked && (
              <div className="noscroll" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 8px" }}>
                {highest > 0 && <Quick on={call}>Call {F(highest)}</Quick>}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, opacity: locked ? 0.35 : 1 }}>
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "del"].map((k) => (
                <button key={k} onClick={() => press(k)} style={keyBtn}>{k === "del" ? "⌫" : k}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
              <button onClick={toggleFold} disabled={target.kind !== "seat"} style={{
                ...keyBtn, flex: 1, fontSize: 14, fontFamily: SANS, fontWeight: 600, padding: "13px 0",
                color: tSeat && isOut(tSeat) ? C.bg : C.no, background: tSeat && isOut(tSeat) ? C.no : C.key,
              }}>Fold</button>
              <button onClick={toggleAllIn} disabled={target.kind !== "seat"} style={{
                ...keyBtn, flex: 1, fontSize: 14, fontFamily: SANS, fontWeight: 600, padding: "13px 0",
                color: tSeat && isShoved(tSeat) ? C.bg : C.allin, background: tSeat && isShoved(tSeat) ? C.allin : C.key,
              }}>All in</button>
              <button onClick={nextSeat} disabled={target.kind !== "seat"} style={{
                ...keyBtn, flex: 1, fontSize: 14, fontFamily: SANS, fontWeight: 600, padding: "13px 0",
              }}>Next</button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

/* ── bits ───────────────────────────────────────────────── */
function Shell({ children }) {
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: SANS, display: "flex", flexDirection: "column", height: "100dvh" }}>
      <style>{`* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; color: inherit; }
        button:focus-visible { outline: 2px solid ${C.go}; outline-offset: 2px; }
        .noscroll::-webkit-scrollbar { display: none; }
        .noscroll { scrollbar-width: none; }`}</style>
      {children}
    </div>
  );
}

function Tile({ kind, label, value, target, setTarget }) {
  const on = target.kind === kind;
  return (
    <button onClick={() => setTarget({ kind })} style={{
      flex: 1, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left",
      background: on ? C.key : C.card, border: `2px solid ${on ? C.go : "transparent"}`,
    }}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 2 }}>{label}</div>
      <div style={{ ...num, fontSize: 19, fontWeight: 700 }}>{F(N(value))}</div>
    </button>
  );
}

function Quick({ children, on }) {
  return (
    <button onClick={on} style={{
      background: C.key, border: "none", color: C.text, borderRadius: 10,
      padding: "9px 14px", fontSize: 13, cursor: "pointer", flexShrink: 0, ...num,
    }}>{children}</button>
  );
}

const keyBtn = {
  padding: "14px 0", background: C.key, border: "none", borderRadius: 11,
  color: C.text, fontSize: 20, fontWeight: 600, cursor: "pointer", fontFamily: MONO,
};
const tag = (color) => ({
  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color,
  border: `1px solid ${color}`, borderRadius: 6, padding: "3px 6px", whiteSpace: "nowrap",
});
const stepBtn = (off) => ({
  flex: 1, padding: "13px 0", background: C.card, border: "none", borderRadius: 13,
  color: off ? C.line : C.dim, fontSize: 14, fontWeight: 600, cursor: off ? "default" : "pointer",
});
