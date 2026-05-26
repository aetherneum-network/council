# Contributing to The Council

Thanks for helping convene a better Council. This is a small, dependency-free
project on purpose — contributions that keep it that way are the most welcome.

## Ways to contribute

- **Add a seat (provider).** Most providers speak the OpenAI wire format, so adding one
  is usually a single entry in [`src/providers.mjs`](src/providers.mjs):

  ```js
  {
    id: "together",
    seat: "Together",
    type: "openai",                       // "openai" or "anthropic"
    base: "https://api.together.xyz/v1",
    envKey: "TOGETHER_API_KEY",
    envModel: "COUNCIL_TOGETHER_MODEL",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  }
  ```

  Then add a row to the seats table in the README. That's it.

- **Translate the README.** Copy `README.md` to `README.<lang>.md`, translate the prose
  (keep the code blocks as-is), and add your language to the Translations line. High-leverage
  and very welcome.

- **Improve the prompt / aggregation.** The seat instruction lives in
  [`src/prompt.mjs`](src/prompt.mjs); the quorum + dissent logic in
  [`src/council.mjs`](src/council.mjs). If you change verdict semantics, update the README table.

- **Report a bug** with a minimal repro: the command you ran, the seats active
  (`council --seats`), and what you expected vs. got. Never paste your API keys.

## Ground rules

- **Zero runtime dependencies.** Node built-ins only (`fetch`, `node:*`). If you think a dep
  is unavoidable, open a Discussion first.
- **Node ≥ 18**, ESM (`.mjs`).
- **No telemetry, ever.** Keys and prompts stay on the user's machine.
- Keep PRs focused. One seat / one fix / one translation per PR.

## Local dev

```bash
git clone https://github.com/aetherneum-network/council
cd council
export ANTHROPIC_API_KEY=...        # at least one seat
node bin/council.mjs "Should we ship this?"
node bin/council.mjs --demo         # no key needed
```

## Code of conduct

Be precise, be kind, attack the argument not the person — same standard the Council
holds itself to. Discussion: <https://github.com/aetherneum-network/council/discussions>

*Per Æthera Ad Astra.*
