// Core: convene the Council. Public API:  convene(question, options) -> result
import { activeSeats, askSeat } from "./providers.mjs";
import { buildMessages, parseVerdict, VERDICTS } from "./prompt.mjs";

const DEFAULTS = {
  context: "",
  temperature: 0.2,
  maxTokens: 900,
  timeout: 60000,
  env: undefined, // defaults to process.env inside activeSeats
};

export async function convene(question, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const seats = activeSeats(opts.env || process.env);
  if (seats.length === 0) {
    const err = new Error("No active seats: set at least one provider API key (e.g. ANTHROPIC_API_KEY, GROQ_API_KEY).");
    err.code = "NO_SEATS";
    throw err;
  }
  const { system, user } = buildMessages(question, opts.context);

  const settled = await Promise.allSettled(
    seats.map(async (seat) => {
      const t0 = Date.now();
      const raw = await askSeat(seat, system, user, opts);
      const v = parseVerdict(raw);
      if (!v) throw new Error(`${seat.seat}: could not parse a verdict from the reply`);
      return { ...v, seat: seat.seat, id: seat.id, model: seat.model, ms: Date.now() - t0 };
    })
  );

  const opinions = [];
  const errors = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") opinions.push(s.value);
    else errors.push({ seat: seats[i].seat, id: seats[i].id, error: String(s.reason?.message || s.reason) });
  });

  return summarize(question, opinions, errors, seats.length);
}

// Tally votes (abstain does not count toward quorum), pick the panel verdict,
// and surface disagreement explicitly — that's the whole point of a council.
export function summarize(question, opinions, errors, seatsAttempted) {
  const tally = { approve: 0, revise: 0, veto: 0, abstain: 0 };
  for (const o of opinions) tally[o.verdict]++;

  const voting = opinions.filter((o) => o.verdict !== "abstain");
  const vetoed = tally.veto > 0;

  // ranked non-abstain verdicts by count, tie-broken by summed confidence
  const order = ["approve", "revise", "veto"];
  const ranked = order
    .map((v) => ({
      v,
      n: tally[v],
      conf: voting.filter((o) => o.verdict === v).reduce((a, o) => a + o.confidence, 0),
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || b.conf - a.conf);

  let panel;
  if (voting.length === 0) panel = "abstain"; // nobody could judge
  else if (vetoed && tally.veto >= Math.ceil(voting.length / 2)) panel = "veto"; // strong veto
  else panel = ranked[0].v;

  const distinct = new Set(voting.map((o) => o.verdict));
  const split = distinct.size > 1;
  const unanimous = voting.length > 0 && distinct.size === 1 && tally.abstain === 0;

  // agreement = share of voting seats that match the panel verdict
  const matching = voting.filter((o) => o.verdict === panel).length;
  const agreement = voting.length ? matching / voting.length : 0;

  // collect the dissent (anyone who did not vote the panel line) + a flat risk list
  const dissent = voting
    .filter((o) => o.verdict !== panel)
    .map((o) => ({ seat: o.seat, verdict: o.verdict, headline: o.headline, confidence: o.confidence }));
  const risks = [];
  for (const o of opinions) for (const r of o.risks) risks.push({ seat: o.seat, risk: r });

  return {
    question,
    panel, // approve | revise | veto | abstain
    vetoed,
    split,
    unanimous,
    agreement, // 0..1
    tally,
    seats: { attempted: seatsAttempted, answered: opinions.length, failed: errors.length },
    opinions, // full per-seat detail
    dissent,
    risks,
    errors,
    generatedAt: new Date().toISOString(),
  };
}

export { VERDICTS };
