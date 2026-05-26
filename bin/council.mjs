#!/usr/bin/env node
// The Council — convene a panel of AI models on any decision.
// Usage:  council "Should we store JWTs in localStorage?"
//         git diff | council "Review this change"
//         council -f rfc.md "Is this design sound?"
//         council --diff --markdown   (in CI: review the PR diff)
import { readFileSync, existsSync, fstatSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { convene } from "../src/council.mjs";
import { renderTerminal, renderMarkdown } from "../src/render.mjs";
import { activeSeats } from "../src/providers.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

function flag(...names) {
  for (const n of names) {
    const i = argv.indexOf(n);
    if (i !== -1) return { present: true, value: argv[i + 1] && !argv[i + 1].startsWith("-") ? argv[i + 1] : true, index: i };
  }
  return { present: false };
}

const HELP = `
◇ The Council — a multi-model verdict on any decision.

USAGE
  council "<question>"               Convene the Council on a question
  git diff | council "<question>"    Pipe an artifact in as context
  council -f <file> "<question>"     Attach a file as context
  council --diff "<question>"        Use \`git diff\` (HEAD) as context
  council --demo                     Show a recorded example (no API key needed)
  council --seats                    List the seats you have keys for

OPTIONS
  -f, --file <path>     Attach a file as the artifact under review
      --diff [ref]      Attach \`git diff <ref>\` (default: HEAD) as the artifact
      --stdin           Read the artifact from standard input
      --json            Print the full verdict as JSON
      --md, --markdown  Print a Markdown report (for PR comments)
      --fail-on <v>     Exit non-zero if panel verdict is this or worse
                        (veto | revise) — handy in CI
  -h, --help            Show this help
  -v, --version         Show version

SEATS
  A "seat" activates when its API key is in the environment. Set any of:
    ANTHROPIC_API_KEY  GROQ_API_KEY  CEREBRAS_API_KEY  MOONSHOT_API_KEY
    OPENAI_API_KEY  DEEPSEEK_API_KEY  MISTRAL_API_KEY  XAI_API_KEY  OPENROUTER_API_KEY
  No key, no seat. The Council is whoever you bring to the table.

  https://github.com/aetherneum-network/council
`;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Read stdin ONLY when it's a real pipe/redirect — never block on a TTY or an
// idle fd (which would hang `council "q"` in CI / scripts with no input).
function pipedStdin() {
  try {
    if (process.stdin.isTTY) return "";
    const st = fstatSync(0);
    if (st.isFIFO() || st.isFile()) return readFileSync(0, "utf8");
  } catch {}
  return "";
}

async function gitDiff(ref) {
  const { execSync } = await import("node:child_process");
  try {
    return execSync(`git diff ${ref || "HEAD"}`, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    return "";
  }
}

async function main() {
  if (flag("-h", "--help").present || argv.length === 0) {
    process.stdout.write(HELP);
    return;
  }
  if (flag("-v", "--version").present) {
    const pkg = JSON.parse(readFileSync(join(__dir, "..", "package.json"), "utf8"));
    console.log(pkg.version);
    return;
  }
  if (flag("--seats").present) {
    const seats = activeSeats();
    if (!seats.length) {
      console.log("No active seats. Set a provider API key (see `council --help`).");
      process.exit(1);
    }
    console.log("Active seats:");
    for (const s of seats) console.log(`  • ${s.seat.padEnd(20)} ${s.model}`);
    return;
  }
  if (flag("--demo").present) {
    const demoPath = join(__dir, "..", "src", "demo-result.json");
    if (!existsSync(demoPath)) {
      console.error("demo data missing");
      process.exit(1);
    }
    const r = JSON.parse(readFileSync(demoPath, "utf8").replace(/^﻿/, ""));
    process.stdout.write(renderTerminal(r));
    console.log("\n  " + "(recorded example — run with your own API keys for a live verdict)\n");
    return;
  }

  const asJson = flag("--json").present;
  const asMd = flag("--md", "--markdown").present;
  const failOn = flag("--fail-on").value;

  // gather context
  let context = "";
  const f = flag("-f", "--file");
  if (f.present && typeof f.value === "string") context = readFileSync(f.value, "utf8");
  const d = flag("--diff");
  if (d.present) context = await gitDiff(typeof d.value === "string" ? d.value : "");
  if (flag("--stdin").present) context = readStdin();
  // also accept piped stdin automatically — but only a real pipe/redirect, never block
  if (!context) {
    const s = pipedStdin();
    if (s) context = s;
  }

  // the question = the first non-flag positional argument
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("-")) {
      // skip a value if this flag consumes one
      if (["-f", "--file", "--fail-on", "--diff", "--seats"].includes(a) && argv[i + 1] && !argv[i + 1].startsWith("-")) {
        if (a !== "--diff") i++; // --diff's value is optional but we already captured it
      }
      continue;
    }
    positionals.push(a);
  }
  const question = positionals.join(" ").trim() || (context ? "Review the attached artifact and give a verdict." : "");
  if (!question) {
    console.error("No question given. Try:  council \"Should we ship this?\"  (or --help)");
    process.exit(2);
  }

  let r;
  try {
    if (!asJson && process.stdout.isTTY) process.stderr.write("  ◇ convening the Council…\n");
    r = await convene(question, { context });
  } catch (e) {
    if (e.code === "NO_SEATS") {
      console.error("\n  No active seats. Set at least one provider API key:\n" +
        "    export ANTHROPIC_API_KEY=...   # or GROQ_API_KEY, OPENAI_API_KEY, …\n" +
        "  Then try again, or run `council --demo` to see an example.\n");
      process.exit(1);
    }
    console.error("council error:", e.message);
    process.exit(1);
  }

  if (asJson) console.log(JSON.stringify(r, null, 2));
  else if (asMd) console.log(renderMarkdown(r));
  else process.stdout.write(renderTerminal(r));

  if (failOn) {
    const sev = { approve: 0, revise: 1, veto: 2, abstain: 0 };
    const threshold = sev[failOn] ?? 99;
    if ((sev[r.panel] ?? 0) >= threshold) process.exit(3);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
