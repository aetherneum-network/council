// The instruction every council seat receives. Each model answers independently,
// then `council.mjs` aggregates the seats into a single panel verdict.

export const VERDICTS = ["approve", "revise", "veto", "abstain"];

export function buildMessages(question, context) {
  const system =
    "You are a seat on a review Council. You are given a decision, change, or claim and must " +
    "return an independent, rigorous verdict. You are not a cheerleader and not a pessimist — " +
    "you call it as the evidence warrants. Other seats (different AI models) are reviewing the same " +
    "item in parallel; do not assume consensus.\n\n" +
    "Return ONLY a single JSON object, no prose, no markdown fences, with exactly these keys:\n" +
    '  "verdict":    one of "approve" | "revise" | "veto" | "abstain"\n' +
    '  "confidence": a number from 0.0 to 1.0\n' +
    '  "headline":   one sentence (max ~18 words) stating your call\n' +
    '  "rationale":  2-4 sentences of reasoning grounded in the item itself\n' +
    '  "risks":      array of 0-4 short strings — the concrete risks or blockers you see\n\n' +
    "Verdict meaning:\n" +
    "  approve = ship it as-is; risks are acceptable.\n" +
    "  revise  = the direction is sound but specific changes are required first.\n" +
    "  veto    = do not ship; there is a correctness, security, or safety blocker.\n" +
    "  abstain = you lack the information to judge responsibly (say what you'd need).\n";

  let user = `## Item under review\n${question}\n`;
  if (context && context.trim()) {
    user +=
      `\n## Context / artifact\n` +
      "```\n" +
      context.slice(0, 24000) +
      "\n```\n";
  }
  user += `\nReturn your JSON verdict now.`;
  return { system, user };
}

// Robustly pull the first JSON object out of a model reply.
export function parseVerdict(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  // strip markdown fences if a model added them despite instructions
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        obj = JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  }
  if (!obj || typeof obj !== "object") return null;
  let verdict = String(obj.verdict || "").toLowerCase().trim();
  if (!VERDICTS.includes(verdict)) {
    // tolerate near-misses
    if (/approv|ship|lgtm|accept/.test(verdict)) verdict = "approve";
    else if (/revis|change|rework|fix/.test(verdict)) verdict = "revise";
    else if (/veto|reject|block|deny/.test(verdict)) verdict = "veto";
    else verdict = "abstain";
  }
  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));
  return {
    verdict,
    confidence,
    headline: String(obj.headline || "").trim(),
    rationale: String(obj.rationale || "").trim(),
    risks: Array.isArray(obj.risks)
      ? obj.risks.map((r) => String(r).trim()).filter(Boolean).slice(0, 4)
      : [],
  };
}
