# cc-i18n

**让 Claude Code 说你的语言**

> Claude Code 的终端界面全部是英文硬编码的。这个工具解决这个问题。

[![npm version](https://img.shields.io/npm/v/cc-i18n.svg)](https://www.npmjs.com/package/cc-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | [繁體中文](./README.zh-TW.md)

---

## 功能

cc-i18n 翻译 Claude Code 的**整个终端界面**：

- 权限提示（允许 / 拒绝 / 永远允许...）
- 状态消息（思考中... / 运行中... / 压缩对话中...）
- 模式标签（规划模式 / 接受编辑 / 跳过权限...）
- 错误消息、按钮文字等
- 同时让 Claude 的 AI 回复也使用中文

### 小学生模式

特别的「小学生版」用最简单的词汇 + emoji 解释所有功能：

| 英文 | 简体中文 | 小学生版 |
|------|---------|---------|
| Allow | 允许 | 👍 好的 |
| Deny | 拒绝 | 🚫 不要 |
| Thinking... | 思考中... | 🤔 想一想... |
| Running... | 运行中... | ⚡ 在做了在做了... |
| Plan Mode | 规划模式 | 📋 只看不做模式 |

---

## 快速开始

```bash
# 安装
npm install -g cc-i18n

# 切换到简体中文
cc-i18n patch --lang zh-CN

# 切换到小学生版
cc-i18n patch --lang zh-CN --kids

# 查看状态
cc-i18n status

# 还原英文
cc-i18n unpatch
```

---

## 命令

| 命令 | 说明 |
|------|------|
| `cc-i18n patch --lang <语言>` | 应用翻译 |
| `cc-i18n unpatch` | 还原英文 |
| `cc-i18n status` | 查看当前状态 |
| `cc-i18n list` | 列出可用语言 |
| `cc-i18n extract` | 提取 UI 字符串（翻译用） |
| `cc-i18n contribute --lang <语言>` | 生成翻译模板 |
| `cc-i18n check-update` | 检查 CC 更新，自动重新翻译 |

---

## CC 更新后自动重新翻译

Claude Code 更新会覆盖翻译过的文件。加这段到 `.zshrc` 就能自动重新翻译：

```bash
cc-i18n check-update --hook >> ~/.zshrc
source ~/.zshrc
```

---

## 安全机制

- 修改前自动备份原始文件
- 修改后验证：cli.js 用 `node --check` 检查语法；可执行文件则实际启动一次 `claude --version` 确认能跑
- 验证失败自动还原
- 随时可用 `cc-i18n unpatch` 完整还原

---

## 支持的 Claude Code 版本

| CC 版本 | 安装方式 | 做法 |
|---------|---------|------|
| ≤ 2.0 | npm / Volta / nvm | 替换 `cli.js` 里的字符串 |
| ≥ 2.1（没有 cli.js） | npm、Homebrew、native installer | 直接改写可执行文件内嵌的代码；文件大小不变，macOS 自动重新签名 |

2.1+ 的代价：每次启动慢约 0.4 秒（预编译缓存失效）。

---

## 贡献翻译

```bash
# 生成空白翻译模板
cc-i18n contribute --lang ja

# 填写翻译后，复制到 src/translations/
# 测试：cc-i18n patch --lang ja
# 提交 PR！
```

---

## 许可证

MIT
