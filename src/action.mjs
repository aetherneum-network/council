// GitHub Action runner: convene the Council on the current PR's diff and post a
// single sticky comment with the verdict. Uses only Node built-ins + GITHUB_TOKEN.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { convene } from "./council.mjs";
import { renderMarkdown } from "./render.mjs";

const TAG = "<!-- aetherneum-council -->";

function event() {
  try {
    return JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  } catch {
    return {};
  }
}

function prDiff(base) {
  // shallow checkouts may not have the base; fetch it best-effort
  try {
    execSync(`git fetch --no-tags --depth=1 origin ${base}`, { stdio: "ignore" });
  } catch {}
  for (const ref of [`origin/${base}...HEAD`, `origin/${base}`, "HEAD~1", "HEAD"]) {
    try {
      const d = execSync(`git diff ${ref}`, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
      if (d.trim()) return d;
    } catch {}
  }
  return "";
}

async function gh(method, url, body) {
  const r = await fetch(`https://api.github.com${url}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "aetherneum-council",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`GitHub ${method} ${url} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function upsertComment(repo, prNumber, body) {
  const comments = await gh("GET", `/repos/${repo}/issues/${prNumber}/comments?per_page=100`);
  const mine = comments.find((c) => (c.body || "").includes(TAG));
  const payload = { body: `${TAG}\n${body}` };
  if (mine) await gh("PATCH", `/repos/${repo}/issues/comments/${mine.id}`, payload);
  else await gh("POST", `/repos/${repo}/issues/${prNumber}/comments`, payload);
}

async function main() {
  const ev = event();
  const pr = ev.pull_request;
  const repo = process.env.GITHUB_REPOSITORY;
  const base = pr?.base?.ref || "main";
  const context = prDiff(base);
  if (!context.trim()) {
    console.log("Council: no diff to review; skipping.");
    return;
  }

  const question = process.env.COUNCIL_QUESTION || "Review this pull request. Is it safe to merge?";
  let r;
  try {
    r = await convene(question, { context });
  } catch (e) {
    console.error("Council error:", e.message);
    if (e.code === "NO_SEATS")
      console.error("Set provider API keys as repo secrets (e.g. ANTHROPIC_API_KEY) and pass them as env to this step.");
    process.exit(1);
  }

  const md = renderMarkdown(r);
  console.log(md);

  if (process.env.COUNCIL_COMMENT !== "false" && pr && repo && process.env.GITHUB_TOKEN) {
    try {
      await upsertComment(repo, pr.number, md);
      console.log(`Council: posted verdict to ${repo}#${pr.number}`);
    } catch (e) {
      console.error("Council: could not post comment:", e.message);
    }
  }

  // job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      const { appendFileSync } = await import("node:fs");
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
    } catch {}
  }

  const failOn = process.env.COUNCIL_FAIL_ON;
  if (failOn) {
    const sev = { approve: 0, revise: 1, veto: 2, abstain: 0 };
    if ((sev[r.panel] ?? 0) >= (sev[failOn] ?? 99)) {
      console.error(`Council: panel verdict "${r.panel}" meets fail-on "${failOn}" — failing the job.`);
      process.exit(3);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
