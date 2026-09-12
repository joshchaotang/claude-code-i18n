# claude-code-i18n

**讓 Claude Code 說中文**

> Claude Code 的終端介面全是英文，這個工具幫你一鍵翻譯成中文。

[![npm version](https://img.shields.io/npm/v/claude-code-i18n.svg)](https://www.npmjs.com/package/claude-code-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](../README.md) | [简体中文](./README.zh-CN.md)

---

## 三步搞定

```bash
# 安裝
npm install -g claude-code-i18n

# 切換到繁體中文
cc-i18n patch --lang zh-TW

# 自動修復（CC 更新後自動重新翻譯）
cc-i18n install-wrapper
```

就這樣！打開 Claude Code 你會看到全中文介面。

---

## 翻譯了什麼？

- 權限提示（允許 / 拒絕 / 總是允許...）
- 狀態訊息（思考中... / 執行中... / 壓縮中...）
- 模式標籤（規劃模式 / 自動接受編輯 / 略過權限...）
- 錯誤訊息、按鈕文字等
- **AI 回覆也用中文**（透過插件）

### 小學生模式

用最簡單的詞 + emoji 解釋一切：

| 英文 | 繁體中文 | 小學生版 |
|------|---------|---------|
| Allow | 允許 | 👍 好的 |
| Deny | 拒絕 | 🚫 不要 |
| Thinking... | 思考中... | 🤔 想一想... |
| Running... | 執行中... | ⚡ 在做了在做了... |

```bash
cc-i18n patch --lang zh-TW --kids
```

---

## 支援語言

| 語系 | 語言 | 小學生版 |
|------|------|---------|
| `zh-TW` | 繁體中文 | ✅ |
| `zh-CN` | 简体中文 | ✅ |

歡迎貢獻更多語言！詳見 [新語言指南](./cc-i18n-new-lang-playbook.md)

---

## 常用指令

```bash
cc-i18n patch --lang zh-TW     # 套用繁體中文
cc-i18n patch --lang zh-CN     # 套用简体中文
cc-i18n unpatch                 # 還原英文
cc-i18n status                  # 查看狀態
cc-i18n install-wrapper         # 安裝自動修復
```

---

## CC 更新後怎麼辦？

Claude Code 更新會覆蓋翻譯。有兩種方式自動修復：

**方法一：安裝 wrapper（推薦）**
```bash
cc-i18n install-wrapper
```
Wrapper 會在每次啟動 Claude Code 時自動偵測更新並重新翻譯。

**方法二：Shell hook**
```bash
cc-i18n check-update --hook >> ~/.zshrc
source ~/.zshrc
```

---

## 運作原理

| 層級 | 翻譯什麼 | 方法 |
|------|---------|------|
| **Patcher** | 系統 UI：按鈕、提示、狀態列 | 替換 CC 程式裡的字串（≤2.0 是 `cli.js`；≥2.1 直接改寫執行檔內嵌的程式碼） |
| **Plugin** | AI 內容：回覆、說明 | `~/.claude/` 中的 CLAUDE.md 規則 |

### 安全機制

- **備份**：修改前自動備份原始檔案（2.1+ 的執行檔備份放在 `~/.cc-i18n/backups/`）
- **驗證**：`cli.js` 用 `node --check` 驗證語法；執行檔則實際啟動一次 `claude --version` 確認能跑（macOS 會先重新簽章）
- **自動還原**：驗證失敗時自動還原
- **完全可逆**：`cc-i18n unpatch` 隨時還原

---

## FAQ

**Q: 會影響 Claude Code 的功能嗎？**
A: 不會。只改 UI 文字，不改任何邏輯。

**Q: 會消耗額外 token 嗎？**
A: 零。UI 翻譯是純本地字串替換。

**Q: 支援哪些安裝方式的 CC？**
A: npm 全域安裝、Homebrew、native installer（`~/.local/share/claude/`）、Volta、nvm 都支援。

**Q: Claude Code 2.1 之後沒有 cli.js 了，還能用嗎？**
A: 可以。cc-i18n 會直接改寫執行檔裡內嵌的程式碼，檔案大小不變；代價是啟動慢約 0.4 秒。

---

## License

MIT
