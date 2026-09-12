# claude-code-i18n

**让 Claude Code 说中文**

> Claude Code 的终端界面全是英文，这个工具帮你一键翻译成中文。

[![npm version](https://img.shields.io/npm/v/claude-code-i18n.svg)](https://www.npmjs.com/package/claude-code-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](../README.md) | [繁體中文](./README.zh-TW.md)

---

## 三步搞定

```bash
# 安装
npm install -g claude-code-i18n

# 切换到简体中文
cc-i18n patch --lang zh-CN

# 自动修复（CC 更新后自动重新翻译）
cc-i18n install-wrapper
```

就这样！打开 Claude Code 你会看到全中文界面。

---

## 翻译了什么？

- 权限提示（允许 / 拒绝 / 总是允许...）
- 状态信息（思考中... / 执行中... / 压缩中...）
- 模式标签（规划模式 / 自动接受编辑 / 跳过权限...）
- 错误信息、按钮文字等
- **AI 回复也用中文**（通过插件）

### 小学生模式

用最简单的词 + emoji 解释一切：

| 英文 | 简体中文 | 小学生版 |
|------|---------|---------|
| Allow | 允许 | 👍 好的 |
| Deny | 拒绝 | 🚫 不要 |
| Thinking... | 思考中... | 🤔 想一想... |
| Running... | 执行中... | ⚡ 在做了在做了... |

```bash
cc-i18n patch --lang zh-CN --kids
```

---

## 支持语言

| 语系 | 语言 | 小学生版 |
|------|------|---------|
| `zh-TW` | 繁體中文 | ✅ |
| `zh-CN` | 简体中文 | ✅ |

欢迎贡献更多语言！详见 [新语言指南](./cc-i18n-new-lang-playbook.md)

---

## 常用命令

```bash
cc-i18n patch --lang zh-CN     # 应用简体中文
cc-i18n patch --lang zh-TW     # 应用繁體中文
cc-i18n unpatch                 # 还原英文
cc-i18n status                  # 查看状态
cc-i18n install-wrapper         # 安装自动修复
```

---

## CC 更新后怎么办？

Claude Code 更新会覆盖翻译。有两种方式自动修复：

**方法一：安装 wrapper（推荐）**
```bash
cc-i18n install-wrapper
```
Wrapper 会在每次启动 Claude Code 时自动检测更新并重新翻译。

**方法二：Shell hook**
```bash
cc-i18n check-update --hook >> ~/.zshrc
source ~/.zshrc
```

---

## 工作原理

| 层级 | 翻译什么 | 方法 |
|------|---------|------|
| **Patcher** | 系统 UI：按钮、提示、状态栏 | 替换 CC 程序里的字符串（≤2.0 是 `cli.js`；≥2.1 直接改写可执行文件内嵌的代码） |
| **Plugin** | AI 内容：回复、说明 | `~/.claude/` 中的 CLAUDE.md 规则 |

### 安全机制

- **备份**：修改前自动备份原始文件（2.1+ 的可执行文件备份放在 `~/.cc-i18n/backups/`）
- **验证**：`cli.js` 用 `node --check` 验证语法；可执行文件则实际启动一次 `claude --version` 确认能跑（macOS 会先重新签名）
- **自动还原**：验证失败时自动还原
- **完全可逆**：`cc-i18n unpatch` 随时还原

---

## FAQ

**Q: 会影响 Claude Code 的功能吗？**
A: 不会。只改 UI 文字，不改任何逻辑。

**Q: 会消耗额外 token 吗？**
A: 零。UI 翻译是纯本地字符串替换。

**Q: 支持哪些安装方式的 CC？**
A: npm 全局安装、Homebrew、native installer（`~/.local/share/claude/`）、Volta、nvm 都支持。

**Q: Claude Code 2.1 之后没有 cli.js 了，还能用吗？**
A: 可以。cc-i18n 会直接改写可执行文件里内嵌的代码，文件大小不变；代价是启动慢约 0.4 秒。

---

## License

MIT
