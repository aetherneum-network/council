<div align="center">

# ◇ The Council

### 一个模型只有观点，一个委员会才能给出裁决。

**让多个 AI 模型组成的评审团对任何决定进行评审 —— 一个 PR、一份 RFC、一个架构选择、一项断言 ——
得到一个结构化裁决：`approve`（通过）· `revise`（修改）· `veto`（否决），并精确指出模型们在哪里产生了分歧。**

[![npm](https://img.shields.io/npm/v/@aetherneum/council?color=0e7490&label=npm)](https://www.npmjs.com/package/@aetherneum/council)
[![license](https://img.shields.io/badge/license-Apache--2.0-0e7490)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A518-0e7490)](https://nodejs.org)
[![Star](https://img.shields.io/github/stars/aetherneum-network/council?style=social)](https://github.com/aetherneum-network/council)

[English](README.md) · [Italiano](README.it.md) · **简体中文**

<img src="assets/council-demo.gif" alt="The Council 正在对一项决定进行评审" width="720">

</div>

---

单个大模型的评审，只是带着一组盲点的一个声音。**The Council** 让多个不同的模型 *各自独立地*
回答同一个问题，再把它们汇总成一个裁决 —— 并告诉你**它们在哪里产生了分歧**。模型之间的分歧本身就是信号：
那正是人类应该重点审视的地方。

- **默认多模型** —— Claude、Llama、Qwen、Kimi、GPT、DeepSeek、Mistral、Grok……你有谁的密钥就用谁。
- **真正的裁决，而非感觉** —— `approve` / `revise` / `veto` / `abstain`，附带置信度与法定多数。
- **分歧才是产品** —— 每一处分歧、每一个风险都会被呈现，而不是被平均掉。
- **一条命令** —— `npx @aetherneum/council "…"`。无需安装、无需账号、无遥测。
- **CI 原生** —— 一个 GitHub Action，评审每个 PR 并发布一条置顶评论。
- **零锁定** —— 开源（Apache-2.0）、运行时零依赖，你的密钥永远不离开你的机器。

## ⚡ 快速开始（30 秒）

```bash
# 至少带一把密钥 —— 委员会由你邀请谁组成
export ANTHROPIC_API_KEY=...        # 以及/或 GROQ_API_KEY、OPENAI_API_KEY、…

npx @aetherneum/council "我们应该把会话 JWT 存到 localStorage 吗？"
```

评审一个工件，而不只是一个问题：

```bash
npx @aetherneum/council -f rfc.md "这个设计能撑住 1 万并发吗？"

git diff | npx @aetherneum/council "合并前帮我评审这次改动"

# 手边没有密钥？看一个录制好的示例：
npx @aetherneum/council --demo
```

> ⭐ **只要它帮你拦下一次糟糕的合并，就请给个星标。** 这是别人能发现它的方式。

## 🤔 为什么要一个委员会？

|  | 单模型评审 | **The Council** | 纯人工评审 |
|---|:---:|:---:|:---:|
| 覆盖单个模型的盲点 | ❌ | ✅ | ✅ |
| 显式呈现*分歧* | ❌ | ✅ | ⚠️ 慢 |
| 秒级出裁决 | ✅ | ✅ | ❌ |
| 在每个 PR 上无人值守运行 | ⚠️ | ✅ | ❌ |
| 成本 | $ | $$ | $$$$ |
| 模型由你挑选 | ⚠️ | ✅ | — |
| 开源、无供应商锁定 | ⚠️ | ✅ | — |

## 🔁 在 CI 中使用（GitHub Action）

把下面这段放进 `.github/workflows/council.yml` —— 委员会会评审每个 PR 并发布一条置顶评论：

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

## 🎟 席位 —— 自带密钥

只有当某个 provider 的密钥存在于环境变量中时，对应席位才会激活。没有密钥，就没有席位：
`ANTHROPIC_API_KEY` · `GROQ_API_KEY` · `CEREBRAS_API_KEY` · `MOONSHOT_API_KEY` · `OPENAI_API_KEY` ·
`DEEPSEEK_API_KEY` · `MISTRAL_API_KEY` · `XAI_API_KEY` · `OPENROUTER_API_KEY`。

## 🤝 参与贡献

新增一个 provider 通常只需在 [`src/providers.mjs`](src/providers.mjs) 里加一行。欢迎提交 bug、
新席位与 README 翻译 —— 见 [CONTRIBUTING](CONTRIBUTING.md)。

<div align="center">

The Council 是 **[Aetherneum](https://aetherneum.com)** 内部评审协议的开源内核。

**[aetherneum.com](https://aetherneum.com)** · Apache-2.0 · *Per Æthera Ad Astra.*

⭐ **点亮星标**，让下一个人也能找到它。

</div>
