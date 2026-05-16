# Eliza 本地开发说明（中文）

本文基于当前仓库在 `2026-05-15` 的实际排查结果编写，重点是给出一条可落地的本地编译/启动方案，并明确说明当前仓库快照下的一次性准备步骤和剩余已知告警。

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

## 3.1 本地 `n8n` 一次性准备

如果你需要根目录 `bun run dev` 带着本地 `n8n` 一起工作，建议先做一次本地安装：

```bash
mkdir -p ~/.eliza/n8n
cd ~/.eliza/n8n
npm init -y
npm install --no-fund --no-audit n8n@1.100.0
```

说明：

- 这一步是一次性的，本机会把 `n8n` 安装到 `~/.eliza/n8n/node_modules`
- 后续 sidecar 会直接复用这个本地安装，而不是每次都临时走一遍 `npm exec n8n@1.100.0` 的冷解析流程
- 首次成功启动后，本地还会生成：
  - `~/.eliza/n8n/owner.json`
  - `~/.eliza/n8n/api-key`
- 这两个文件用于后续复用本地 `n8n` 账号和 API key，避免每次重新引导
## 4. 根目录 `bun run dev`（当前已验证可启动）

这是当前仓库里我最新实际验证通过的“整项目入口”。

### 4.1 启动命令

```bash
bun run dev
```

我在本机实际验证到的结果：

- API 监听在 `http://127.0.0.1:31337`
- `GET /api/health` 返回 `ready: true`
- `GET /api/status` 返回 `state: running`
- Vite UI 可访问 `http://127.0.0.1:2138/`

可用的检查命令：

```bash
curl http://127.0.0.1:31337/api/health
curl http://127.0.0.1:31337/api/status
curl -I http://127.0.0.1:2138
```

### 4.2 WSL 下的 watcher 说明

这次排查里还额外修正了一处 WSL 兼容性问题：

- 在 WSL 环境下，`packages/app-core/scripts/dev-ui.mjs` 里 API watcher 不再优先走 `bun --watch`
- 会改走 `node --import tsx --watch`
- 原因是本机实测 `bun --watch packages/app-core/src/runtime/dev-server.ts` 会出现 Bun 自身 `Segmentation fault`

如果你后续强制想切回 Bun watcher，可以显式设置：

```bash
ELIZA_DEV_API_RUNTIME=bun bun run dev
```

通常不建议这么做。

## 5. 推荐兜底方案：先跑后端/API

如果你只想先确认运行时/API 正常，或者暂时不关心浏览器 UI，可以直接走这条更稳的后端路径。

### 5.1 准备一个最小本地配置

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

### 5.2 启动命令

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

## 6. 模型提供方配置

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

## 6.1 一个可直接用的 DeepSeek 最小示例

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

## 7. 浏览器前端开发模式

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

但是在当前仓库快照和本机环境下，这条“手工拆开的前后端双终端模式”仍不如根目录 `bun run dev` 省心：

- 当前我验证的是：根目录 `bun run dev` 已能把 API 跑起来，且 `http://127.0.0.1:2138/` 首页返回 `200`
- 如果你后续再看到 `@xterm/*`、`sonner`、`@whiskeysockets/baileys` 或 `@napi-rs/keyring` 相关报错，优先看第 `9.7`、`9.8` 节

所以目前建议优先使用根目录 `bun run dev`；如果只是调 API，则继续优先使用第 5 节的后端路径。

## 8. 根目录 `bun run dev` 的补充说明

当前这条入口在本机已经能跑通，但有几个现实点需要知道：

```bash
bun run dev
```

- Linux 下会先尝试 `sudo apt-get install fswebcam`
- 如不想触发这一步，需要设置 `ELIZA_NO_VISION_DEPS=1`
- 如果本地要带 `n8n` 一起跑，首次准备时间主要花在：
  - `~/.eliza/n8n/node_modules` 安装
  - `owner.json` / `api-key` 初始化
- 现在 WSL 下 API watcher 已改用 Node 路径，绕开了 Bun watcher 崩溃

对应源码位置：

- [packages/app-core/scripts/dev-ui.mjs](/home/dev/github/eliza/packages/app-core/scripts/dev-ui.mjs:752)
- [packages/app-core/scripts/ensure-vision-deps.mjs](/home/dev/github/eliza/packages/app-core/scripts/ensure-vision-deps.mjs:138)

如果你想尽量减少首次启动中的额外干扰，可以先这样：

```bash
ELIZA_NO_VISION_DEPS=1 bun run dev
```

这条路径在我本机上已经验证到：

- `GET /api/health` 返回 `ready: true`
- `GET /api/status` 返回 `state: running`
- `http://127.0.0.1:2138/` 首页返回 `200`
- 之前出现过的 `@xterm/*`、`sonner`、`@whiskeysockets/baileys`、`@napi-rs/keyring` 前端解析问题，当前这份仓库里已经做过一次本地修复；如果你再次遇到，直接看第 `9.7`、`9.8` 节即可
- 启动日志里仍可能看到某些 `packages/native-plugins/*` 的 `rollup: command not found` 构建警告，但它不会阻塞当前这条 Web 开发入口起服务

## 8. 完整构建现状

当前仓库快照下，整仓完整构建仍然不是完全无告警状态。

```bash
bun run build
```

我排查到的现状是：

- 依赖安装可以完成
- `packages/core` 的预生成步骤可以完成
- 纯后端/API 启动可以完成
- 根目录 `bun run dev` 现在可以完成 API + agent 启动，且前端首页可访问
- 但完整前端依赖图仍可能出现可选模块告警，特别是某些插件页面和 Vite 依赖预优化阶段

因此，现阶段更稳妥的本地开发方式是：

1. 先按第 3 节补齐生成/插件构建，再按第 3.1 节做一次本地 `n8n` 安装
2. 优先直接使用第 4 节的根目录 `bun run dev`
3. 如果你只想先调后端/API，再回退到第 5 节的 `packages/agent start`
4. 如果浏览器里个别页面仍报前端依赖错误，那么问题已经不在“项目起不来”，而在当前仓库快照下某些可选 UI 模块依赖尚未完全清理

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

### 9.6 `bun run dev` 卡在 `Waiting for agent to be ready ... 120s`

如果日志里出现类似内容：

```text
[eliza] Waiting for agent to be ready...
[n8n-sidecar] ...
[eliza] Agent runtime not ready after 120s (port 31337 is up but /api/health never reported ready)
```

这通常说明当前不是 `fswebcam` 的问题，而是本地 `n8n` sidecar 在启动阶段卡住了。

这一类问题在 WSL 下尤其常见，典型特征是日志里出现 Windows 路径，例如：

```text
/mnt/d/Program Files/nodejs/npx
```

这表示 Eliza 正在 WSL 里调用 Windows 侧的 `npx` 去拉起本地 `n8n`，非常容易导致 sidecar 启动异常、孤儿进程清理失败，进而让 `/api/health` 长时间不 ready。

最直接的规避方式是：先禁用本地 `n8n` sidecar。

例如准备一个 `eliza.local.json5`：

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

然后用这个配置启动：

```bash
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run dev
```

如果你只想先验证后端是否正常，也可以直接用更稳的后端路径：

```bash
ELIZA_CONFIG_PATH=$PWD/eliza.local.json5 bun run --cwd packages/agent start
```

补充说明：

- `n8n.localEnabled=false`：禁止自动拉起本地 `n8n` sidecar
- `n8n.enabled=false`：作为总开关，连 `@elizaos/plugin-n8n-workflow` 的自动启用也一起关掉
- 这不会影响普通聊天、基础 Agent 启动、模型调用等核心流程
- 会影响依赖本地 `n8n` 的自动化/工作流能力

如果你后续确实需要本地 `n8n`，建议优先确保 WSL 内使用的是 Linux 自己的 `node` / `npm` / `npx`，而不是 `/mnt/.../Program Files/nodejs/npx` 这种 Windows 路径。

### 9.7 Windows 浏览器打开 `2138`，页面覆盖提示 `Failed to resolve import "@xterm/xterm"`

典型表现：

```text
[plugin:vite:import-analysis] Failed to resolve import "@xterm/xterm"
```

这通常不是后端没起来，而是前端依赖缺失或根目录 `node_modules` 没有把这些包准备好。

当前这份仓库本机已经补齐并验证过的前端依赖包括：

- `@xterm/xterm`
- `@xterm/addon-fit`
- `sonner`
- `@whiskeysockets/baileys`

如果你再次碰到这个覆盖错误，优先检查：

```bash
test -d node_modules/@xterm/xterm && echo ok || echo missing
test -d node_modules/@xterm/addon-fit && echo ok || echo missing
test -d node_modules/sonner && echo ok || echo missing
test -e node_modules/@whiskeysockets/baileys && echo ok || echo missing
```

然后重启：

```bash
bun run dev
```

### 9.8 Vite 在启动时因为 `@napi-rs/keyring-*.node` 退出

典型表现：

```text
Error during dependency optimization:
Could not load ... @napi-rs/keyring-linux-x64-gnu ... stream did not contain valid UTF-8
```

这不是你的浏览器问题，而是 Vite 依赖预构建错误地把服务端原生 keyring 模块当成浏览器依赖去扫描。

当前本地修复方式是：在 [packages/app/vite.config.ts](/home/gimlee/github/eliza/packages/app/vite.config.ts:825) 里把 `@napi-rs/keyring` 及其平台二进制包明确标成浏览器端 `stub/exclude`。

如果你更新仓库后又重新出现这类报错，优先：

```bash
rm -rf packages/app/.vite
bun run dev
```

如果仍然失败，再检查 `packages/app/vite.config.ts` 中是否还保留了对 `@napi-rs/keyring` 的 `exclude` / `stub` 处理。

### 9.9 点击“本地”后出现 `代理超时`，细节里是 `/api/status - HTTP 401 - Unauthorized`

典型表现：

```text
启动失败：代理超时
/api/status - HTTP 401 - Unauthorized
```

这类问题不一定真的是“代理没起来”，也可能是启动状态机在 `starting-runtime` 阶段先打了 `/api/status`，但当前访问路径实际上需要先走一次 `/api/auth/status` 的授权判断。

当前本地修复后，这类 `401` 会优先回退到授权/配对分支，而不是继续误报成“代理超时”。

如果你刷新后仍看到授权相关界面，说明这次不是假超时，而是当前访问方式确实被后端判定为需要授权；这时优先：

- 确认你访问的是 `http://<WSL-IP>:2138/`，而不是直接访问 `31337`
- 优先通过 `2138` 的 Vite 页面进入，让 `/api` 请求走本地代理
- 如果后端确实开启了远程访问保护，再按页面提示完成 pairing / token 配置

## 10. 本文结论

当前仓库最稳、也最接近官方入口的本地运行方案，已经可以直接用根目录：

```bash
bun run dev
```

截至 `2026-05-16`，我在当前仓库快照上实际验证到：

- `GET http://127.0.0.1:31337/api/health` 返回 `ready: true`
- `GET http://127.0.0.1:2138/` 返回 `200`
- 之前阻塞启动的 `@xterm/xterm` 和 `@napi-rs/keyring` 前端错误已经排除

如果你只是想要一个更稳、更少前端变量的后端/API 路径，仍然可以使用：

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

这条路径也已经在本机验证为 `running`，适合你只调 API、数据库和 Agent 本身时使用。
