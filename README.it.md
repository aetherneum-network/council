<div align="center">

# ◇ The Council

### Un modello ha un'opinione. Un consiglio raggiunge un verdetto.

**Convoca un panel di modelli AI su qualsiasi decisione — una PR, un RFC, una scelta di
architettura, un'affermazione — e ottieni un verdetto strutturato: `approve` · `revise` · `veto`,
più esattamente i punti su cui i modelli sono in disaccordo.**

[![npm](https://img.shields.io/npm/v/@aetherneum/council?color=0e7490&label=npm)](https://www.npmjs.com/package/@aetherneum/council)
[![license](https://img.shields.io/badge/license-Apache--2.0-0e7490)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-0e7490)](https://nodejs.org)
[![Star](https://img.shields.io/github/stars/aetherneum-network/council?style=social)](https://github.com/aetherneum-network/council)

[English](README.md) · **Italiano** · [简体中文](README.zh-CN.md)

<img src="assets/council-demo.gif" alt="Il Council che delibera su una decisione" width="720">

</div>

---

La review di un singolo LLM è una voce sola con un solo set di punti ciechi. **The Council** pone
la stessa domanda a più modelli diversi *in modo indipendente*, poi li aggrega in un unico verdetto —
e ti dice **dove si dividono**. Il disaccordo tra modelli è segnale: è esattamente il punto in cui
un umano dovrebbe guardare.

- **Multi-modello di default** — Claude, Llama, Qwen, Kimi, GPT, DeepSeek, Mistral, Grok… chiunque tu abbia le chiavi.
- **Un verdetto vero, non una sensazione** — `approve` / `revise` / `veto` / `abstain`, con confidenza e quorum.
- **Il disaccordo è il prodotto** — ogni divisione e ogni rischio viene mostrato, non mediato via.
- **Un comando** — `npx @aetherneum/council "…"`. Niente install, niente account, niente telemetria.
- **Nativo in CI** — una GitHub Action che recensisce ogni PR e posta un unico verdetto sticky.
- **Zero lock-in** — open source (Apache-2.0), zero dipendenze a runtime, le tue chiavi non lasciano mai la tua macchina.

## ⚡ Avvio rapido (30 secondi)

```bash
# porta almeno una chiave — il Council è chi inviti tu
export ANTHROPIC_API_KEY=...        # e/o GROQ_API_KEY, OPENAI_API_KEY, …

npx @aetherneum/council "Dovremmo salvare i JWT di sessione in localStorage?"
```

Recensisci un artefatto, non solo una domanda:

```bash
npx @aetherneum/council -f rfc.md "Questo design regge con 10k utenti concorrenti?"

git diff | npx @aetherneum/council "Recensisci questa modifica prima del merge"

# nessuna chiave a portata? guarda un esempio registrato:
npx @aetherneum/council --demo
```

> ⭐ **Se ti evita anche solo un merge sbagliato, mettici una stella.** È così che gli altri lo trovano.

## 🤔 Perché un consiglio?

|  | Review a modello singolo | **The Council** | Review solo umana |
|---|:---:|:---:|:---:|
| Coglie i punti ciechi di un singolo modello | ❌ | ✅ | ✅ |
| Mostra il *disaccordo* in modo esplicito | ❌ | ✅ | ⚠️ lenta |
| Verdetto in secondi | ✅ | ✅ | ❌ |
| Gira su ogni PR, non presidiata | ⚠️ | ✅ | ❌ |
| Costo | $ | $$ | $$$$ |
| Scegli tu i modelli | ⚠️ | ✅ | — |
| Open source, nessun lock-in | ⚠️ | ✅ | — |

## 🔁 In CI (GitHub Action)

Metti questo in `.github/workflows/council.yml` — il Council recensisce ogni PR e posta un commento sticky:

```yaml
name: Council review
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  council:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: aetherneum-network/council@v0
        with:
          fail-on: veto
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GROQ_API_KEY:      ${{ secrets.GROQ_API_KEY }}
```

## 🎟 Seggi — porta le tue chiavi

Un seggio si attiva **solo** quando la sua chiave è nell'ambiente. Niente chiave, niente seggio.
`ANTHROPIC_API_KEY` · `GROQ_API_KEY` · `CEREBRAS_API_KEY` · `MOONSHOT_API_KEY` · `OPENAI_API_KEY` ·
`DEEPSEEK_API_KEY` · `MISTRAL_API_KEY` · `XAI_API_KEY` · `OPENROUTER_API_KEY`.

## 🤝 Contribuire

Aggiungere un provider è di solito una sola riga in [`src/providers.mjs`](src/providers.mjs).
Bug, nuovi seggi e traduzioni del README sono benvenuti — vedi [CONTRIBUTING](CONTRIBUTING.md).

<div align="center">

The Council è il cuore open-source del protocollo di review usato in **[Aetherneum](https://aetherneum.com)**.

**[aetherneum.com](https://aetherneum.com)** · Apache-2.0 · *Per Æthera Ad Astra.*

⭐ **Metti una stella** così la prossima persona lo trova.

</div>
