// Rendering: a brand-tinted terminal report and a Markdown report (PR comments).
const useColor =
  process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const C = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = C("1");
const dim = C("2");
const teal = C("38;5;37");
const gold = C("38;5;136");
const red = C("38;5;167");
const green = C("38;5;36");

const VERDICT_STYLE = {
  approve: { icon: "✓", color: green, label: "APPROVE" },
  revise: { icon: "◑", color: gold, label: "REVISE" },
  veto: { icon: "✕", color: red, label: "VETO" },
  abstain: { icon: "·", color: dim, label: "ABSTAIN" },
};

function bar(p, width = 18) {
  const n = Math.round(p * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

export function renderTerminal(r) {
  const out = [];
  const ps = VERDICT_STYLE[r.panel] || VERDICT_STYLE.abstain;
  out.push("");
  out.push("  " + teal("◇ THE COUNCIL") + dim("  ·  aetherneum.com"));
  out.push("  " + dim("─".repeat(58)));
  out.push("  " + dim("Q: ") + truncate(r.question.replace(/\s+/g, " "), 54));
  out.push("");
  out.push(
    "  " +
      bold(ps.color(`${ps.icon} ${ps.label}`)) +
      "   " +
      dim(`${Math.round(r.agreement * 100)}% agreement`) +
      (r.split ? "  " + gold("⚠ split") : r.unanimous ? "  " + green("· unanimous") : "") +
      (r.vetoed && r.panel !== "veto" ? "  " + red("⚑ veto on record") : "")
  );
  out.push("");

  // per-seat table
  for (const o of r.opinions.sort((a, b) => b.confidence - a.confidence)) {
    const s = VERDICT_STYLE[o.verdict] || VERDICT_STYLE.abstain;
    out.push(
      "  " +
        s.color(s.icon) +
        " " +
        bold(pad(o.seat, 18)) +
        " " +
        s.color(pad(s.label, 8)) +
        " " +
        dim(bar(o.confidence)) +
        " " +
        dim(`${Math.round(o.confidence * 100)}%`)
    );
    if (o.headline) out.push("    " + dim(truncate(o.headline, 64)));
  }

  // disagreement
  if (r.dissent.length) {
    out.push("");
    out.push("  " + gold("WHERE THEY DISAGREE"));
    for (const d of r.dissent) {
      const s = VERDICT_STYLE[d.verdict] || VERDICT_STYLE.abstain;
      out.push("  " + s.color("•") + " " + bold(d.seat) + dim(` wants `) + s.color(s.label) + dim(` — ${truncate(d.headline, 48)}`));
    }
  }

  // top risks
  if (r.risks.length) {
    out.push("");
    out.push("  " + red("RISKS RAISED"));
    for (const x of r.risks.slice(0, 6)) out.push("  " + red("!") + " " + truncate(x.risk, 60) + dim(`  (${x.seat})`));
  }

  if (r.errors.length) {
    out.push("");
    for (const e of r.errors) out.push("  " + dim(`(${e.seat} did not answer: ${truncate(e.error, 50)})`));
  }
  out.push("");
  if (r.certUrl) out.push("  " + teal("◇ certified") + dim(" · ") + r.certUrl);
  out.push("  " + dim(`${r.seats.answered}/${r.seats.attempted} seats answered · per Æthera ad astra`));
  out.push("");
  return out.join("\n");
}

export function renderMarkdown(r) {
  const ICON = { approve: "✅", revise: "🟡", veto: "⛔", abstain: "▫️" };
  const lines = [];
  lines.push(`### ◇ The Council — ${ICON[r.panel]} **${r.panel.toUpperCase()}**`);
  lines.push("");
  lines.push(
    `**${Math.round(r.agreement * 100)}% agreement** across ${r.seats.answered} seats` +
      (r.split ? " · ⚠️ split decision" : r.unanimous ? " · unanimous" : "") +
      (r.vetoed && r.panel !== "veto" ? " · ⚑ veto on record" : "")
  );
  lines.push("");
  lines.push("| Seat | Verdict | Confidence | Call |");
  lines.push("|------|---------|-----------:|------|");
  for (const o of r.opinions.sort((a, b) => b.confidence - a.confidence)) {
    lines.push(
      `| ${o.seat} | ${ICON[o.verdict]} ${o.verdict} | ${Math.round(o.confidence * 100)}% | ${mdEsc(o.headline)} |`
    );
  }
  if (r.dissent.length) {
    lines.push("");
    lines.push("**Where they disagree**");
    for (const d of r.dissent) lines.push(`- ${d.seat} wants **${d.verdict}** — ${mdEsc(d.headline)}`);
  }
  if (r.risks.length) {
    lines.push("");
    lines.push("<details><summary><b>Risks raised</b></summary>\n");
    for (const x of r.risks.slice(0, 12)) lines.push(`- ${mdEsc(x.risk)} _(${x.seat})_`);
    lines.push("\n</details>");
  }
  lines.push("");
  if (r.certUrl) {
    lines.push(`◇ **Certified by The Council** — [view the signed receipt](${r.certUrl})`);
    lines.push("");
  }
  lines.push(
    `<sub>Reviewed by [The Council](https://github.com/aetherneum-network/council) · multi-model verdict, not a single opinion.</sub>`
  );
  return lines.join("\n");
}

const pad = (s, n) => (String(s).length >= n ? String(s).slice(0, n) : String(s) + " ".repeat(n - String(s).length));
const truncate = (s, n) => (String(s).length <= n ? String(s) : String(s).slice(0, n - 1) + "…");
const mdEsc = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
