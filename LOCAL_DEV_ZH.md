# Eliza 本地开发说明（中文）

本文基于当前仓库在 `2026-05-15` 的实际排查结果编写，重点是给出一条可落地的本地编译/启动方案，并明确说明当前仓库快照下未打通的路径。

补充结论：

- 截至 `2026-05-15`，仓库内虽然包含桌面安装脚本和 `.deb` / `.rpm` / `.AppImage` 打包逻辑，但上游 `elizaOS/eliza` 的 `releases/latest/download/...` 实际返回 `404`，因此我没有拿到可直接下载使用的官方二进制发布包。
- 如果后续上游重新提供发布包，那么 Linux 下安装 `.deb` / `.rpm` 仍然会涉及 `sudo`；如果只是跑当前源码仓库，本次实际遇到的 `sudo` 提示来自视觉依赖 `fswebcam` 的自动安装。
- 仓库代码里已经预留了 `DeepSeek` provider 和 `DEEPSEEK_API_KEY` 识别逻辑，但 `@elizaos/plugin-deepseek` 目前尚未发布到 npm；因此在这份仓库快照里，推荐用 `OpenAI-compatible` 的方式接 DeepSeek，而不是依赖未发布插件。

## 1. 已验证环境

- 操作系统：Linux / WSL
- Node.js：`24.15.0`
- Bun：仓库声明为 `1.3.5`，本机现有 `1.3.11`
- 包管理器：`bun`
- 额外本地编译依赖：`make`、`g++`

仓库根目录也明确要求：

```bash
cat .nvmrc
# 24.15.0
```

## 2. 先准备依赖

首次进入仓库，先执行：

```bash
bun install
```

如果安装过程中 `@discordjs/opus` 触发本地编译，请确保机器上有：

```bash
make
g++
```

## 3. 当前仓库建议先补的生成/构建步骤

这个仓库当前不能只靠一次 `bun install` 就直接跑起来，建议先补下面几步：

```bash
bun run --cwd packages/core prebuild
bun run --cwd packages/core build:node
bun run --cwd packages/shared build:i18n
bun run --cwd plugins/plugin-agent-skills build
bun run --cwd plugins/plugin-pdf build
bun run --cwd plugins/plugin-streaming build
```

如果缺这些步骤，常见报错包括：

- `Cannot find module './generated/validation-keyword-data.js'`
- `Cannot find module '@elizaos/plugin-agent-skills'`
- `Cannot find module '@elizaos/plugin-pdf'`
- `Cannot find module '@elizaos/plugin-streaming'`

## 4. 推荐启动方案：先跑后端/API

这是当前仓库里我实际验证通过的方案。

### 4.1 准备一个最小本地配置

建议准备一个临时配置文件，例如 `eliza.local.json5`：

```json5
{
  logging: {
    level: "info",
  },
  ui: {
    assistant: {
      name: "Eliza",
    },
  },
  n8n: {
    enabled: false,
    localEnabled: false,
  },
}
```

说明：

- `ui.assistant.name` 用来跳过首次 CLI 交互式命名向导。
- `n8n.enabled=false` 和 `n8n.localEnabled=false` 用来绕过本地 `n8n` sidecar；当前仓库默认会尝试启用它，容易拖慢甚至卡住启动。

### 4.2 启动命令

```bash
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run --cwd packages/agent start
```

我在本机实际验证到的结果：

- 运行时成功启动
- API 监听在 `http://127.0.0.1:2138`
- `GET /api/health` 返回 `ready: true`
- `GET /api/status` 返回 `state: running`

可用的检查命令：

```bash
curl http://127.0.0.1:2138/api/health
curl http://127.0.0.1:2138/api/status
```

## 5. 模型提供方配置

真正让 Agent 对话可用时，仍然建议你显式配置一个模型提供方。

常见可选项：

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
OPENROUTER_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
```

注意：

- 如果你要接 `DeepSeek`，当前仓库最稳的方式不是 `DEEPSEEK_API_KEY` 直连插件，而是走 `OpenAI-compatible` 配置：

```bash
OPENAI_API_KEY=<你的 DeepSeek API Key>
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_SMALL_MODEL=deepseek-chat
OPENAI_LARGE_MODEL=deepseek-reasoner
```

- 这样做的原因是：`plugin-openai` 已支持自定义 `OPENAI_BASE_URL`，而 `@elizaos/plugin-deepseek` 当前 npm 不可用。
- DeepSeek 在当前仓库里更适合作为文本模型来源；Embedding 仍建议保持默认本地方案，或单独使用 OpenAI / Ollama。
- 当前仓库运行时代码读取的是 `OLLAMA_BASE_URL`
- 但根目录 `.env.example` 里写的是 `OLLAMA_API_ENDPOINT`
- 本地实际使用时请优先按 `OLLAMA_BASE_URL` 配

如果需要你自己填写 API Key、密码或其他敏感信息，请先配好再继续启动。

## 5.1 一个可直接用的 DeepSeek 最小示例

如果你只想尽快把 DeepSeek 接进来，可以在 `eliza.local.json5` 旁边准备一个 `.env`：

```bash
OPENAI_API_KEY=<你的 DeepSeek API Key>
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_SMALL_MODEL=deepseek-chat
OPENAI_LARGE_MODEL=deepseek-reasoner
```

然后按第 4 节的命令启动：

```bash
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run --cwd packages/agent start
```

## 6. 浏览器前端开发模式

理论上的前后端拆分方式如下：

终端 1：

```bash
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run --cwd packages/agent start
```

终端 2：

```bash
ELIZA_API_PORT=2138 ELIZA_PORT=2139 bun run --cwd packages/app dev
```

其中：

- 后端/API 走 `2138`
- Vite 前端走 `2139`
- `packages/app/vite.config.ts` 会把 `/api` 代理到 `2138`

但是在当前仓库快照和本机环境下，这条前端路径未完全打通：

- Vite 依赖预构建阶段会在 `@napi-rs/keyring-*.node` 上失败
- 现象是 Rolldown/Vite 无法处理原生 `.node` 依赖

所以目前“后端/API”路径是已验证成功的，“浏览器前端 HMR”路径是理论可行但本机未完全验证通过。

## 7. 根目录 `bun run dev` 的现状

如果你问的是“整个项目官方应该怎么跑”，仓库根目录给出的入口仍然是：

```bash
bun run dev
```

它的目标是同时拉起 API 和浏览器 UI。

但在当前仓库快照和本机环境下，我不建议把根目录 `bun run dev` 当成首选方案，原因有三点：

```bash
bun run dev
```

- Linux 下会先尝试 `sudo apt-get install fswebcam`
- 如不想触发这一步，需要设置 `ELIZA_NO_VISION_DEPS=1`
- 即使绕过视觉依赖，`packages/app-core/src/runtime/dev-server.ts` 在本机上仍出现 Bun watcher 崩溃

对应源码位置：

- [packages/app-core/scripts/dev-ui.mjs](/home/dev/github/eliza/packages/app-core/scripts/dev-ui.mjs:752)
- [packages/app-core/scripts/ensure-vision-deps.mjs](/home/dev/github/eliza/packages/app-core/scripts/ensure-vision-deps.mjs:138)

如果一定要尝试，可以先这样：

```bash
ELIZA_NO_VISION_DEPS=1 bun run dev
```

但这条路径在我本机上没有最终稳定跑通，所以它属于“官方入口存在，但当前未完全验证成功”的状态。

## 8. 完整构建现状

当前仓库快照下，整仓完整构建并不是全绿状态。

```bash
bun run build
```

我排查到的现状是：

- 依赖安装可以完成
- `packages/core` 的预生成步骤可以完成
- 纯后端/API 启动可以完成
- 但完整前端构建和根目录统一开发脚本仍存在额外问题

因此，现阶段更稳妥的本地开发方式是：

1. 先按第 3 节补齐生成/插件构建
2. 用第 4 节的 `packages/agent start` 路径启动后端
3. 如果你后续必须调试浏览器 UI，先手动安装 `fswebcam`，然后再尝试 `ELIZA_NO_VISION_DEPS=1 bun run dev`
4. 如果 `bun run dev` 仍崩溃，那么问题已经不在“缺少依赖”，而是当前仓库快照的 Bun watcher / Vite 原生依赖兼容性问题

## 9. 常见问题

### 9.1 `fswebcam` / `sudo` 密码提示

根因：根目录 `bun run dev` 会自动尝试安装视觉依赖。

更准确地说，`bun run dev` 会先执行视觉依赖检查脚本：

- Linux：自动检查/安装 `fswebcam`
- macOS：自动检查/安装 `imagesnap`
- Windows：自动检查/安装 `ffmpeg`

对应代码：

- [packages/app-core/scripts/dev-ui.mjs](/home/dev/github/eliza/packages/app-core/scripts/dev-ui.mjs:752)
- [packages/app-core/scripts/ensure-vision-deps.mjs](/home/dev/github/eliza/packages/app-core/scripts/ensure-vision-deps.mjs:176)

`ELIZA_NO_VISION_DEPS=1` 的含义是：

- 跳过这一步“自动安装视觉相关本地工具”的逻辑
- 不再尝试调用 `sudo apt-get install -y fswebcam`
- 适合你当前只是想把主程序先跑起来，不想在启动时被系统包安装流程打断

把它设为 `1` 的后果是：

- 本次启动会绕过视觉依赖自动安装
- 依赖这些本地原生工具的相机/视觉功能，在当前会话里可能不可用或处于降级状态
- 如果机器上本来就已经装好了这些工具，则基本没有副作用，只是单纯跳过检查/安装步骤
- 它不会解决其他启动问题，例如 Bun watcher 崩溃、Vite 原生依赖报错等

可以把它理解成：

- `ELIZA_NO_VISION_DEPS=1` 不是“关闭整个项目的所有视觉能力”
- 它是“不要在启动时自动帮我安装本地视觉工具”

规避：

```bash
ELIZA_NO_VISION_DEPS=1 bun run dev
```

如果你想自己手动完成这一步，可直接执行：

```bash
sudo apt-get install -y fswebcam
```

### 9.2 `validation-keyword-data.js` 缺失

执行：

```bash
bun run --cwd packages/shared build:i18n
```

### 9.3 `plugin-agent-skills` / `plugin-pdf` / `plugin-streaming` 缺失

执行：

```bash
bun run --cwd plugins/plugin-agent-skills build
bun run --cwd plugins/plugin-pdf build
bun run --cwd plugins/plugin-streaming build
```

### 9.4 `@discordjs/opus` 编译失败

安装系统编译工具：

```bash
make
g++
```

### 9.5 本地 `n8n` sidecar 拖慢或卡住启动

在配置里关闭：

```json5
n8n: {
  enabled: false,
  localEnabled: false,
}
```

## 10. 本文结论

当前仓库最稳的本地可运行方案，不是根目录 `bun run dev`，而是：

```bash
bun install
bun run --cwd packages/core prebuild
bun run --cwd packages/core build:node
bun run --cwd packages/shared build:i18n
bun run --cwd plugins/plugin-agent-skills build
bun run --cwd plugins/plugin-pdf build
bun run --cwd plugins/plugin-streaming build
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run --cwd packages/agent start
```

这条路径已经在本机验证为 `running`。

如果你追求的是“整个项目官方入口”：

```bash
ELIZA_NO_VISION_DEPS=1 bun run dev
```

请把它理解为“应该尝试的第一入口”，而不是“我已经在这份仓库快照上完整跑通的入口”。截至 `2026-05-15`，我实际完整验证成功的是后端/API 方案，不是根目录 UI 全链路方案。
