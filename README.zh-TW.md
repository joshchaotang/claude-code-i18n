# cc-i18n

**讓 Claude Code 說你的語言**

> Claude Code 的終端介面全部是英文硬編碼的。這個工具解決這個問題。

[![npm version](https://img.shields.io/npm/v/cc-i18n.svg)](https://www.npmjs.com/package/cc-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | [简体中文](./README.zh-CN.md)

---

## 功能

cc-i18n 翻譯 Claude Code 的**整個終端介面**：

- 權限提示（允許 / 拒絕 / 永遠允許...）
- 狀態訊息（思考中... / 執行中... / 壓縮對話中...）
- 模式標籤（規劃模式 / 接受編輯 / 跳過權限...）
- 錯誤訊息、按鈕文字等
- 同時讓 Claude 的 AI 回覆也使用中文

### 小學生模式

特別的「小學生版」用最簡單的詞彙 + emoji 解釋所有功能：

| 英文 | 繁體中文 | 小學生版 |
|------|---------|---------|
| Allow | 允許 | 👍 好的 |
| Deny | 拒絕 | 🚫 不要 |
| Thinking... | 思考中... | 🤔 想一想... |
| Running... | 執行中... | ⚡ 在做了在做了... |
| Plan Mode | 規劃模式 | 📋 只看不做模式 |

---

## 快速開始

```bash
# 安裝
npm install -g cc-i18n

# 切換到繁體中文
cc-i18n patch --lang zh-TW

# 切換到小學生版
cc-i18n patch --lang zh-TW --kids

# 查看狀態
cc-i18n status

# 還原英文
cc-i18n unpatch
```

---

## 指令

| 指令 | 說明 |
|------|------|
| `cc-i18n patch --lang <語言>` | 套用翻譯 |
| `cc-i18n unpatch` | 還原英文 |
| `cc-i18n status` | 查看目前狀態 |
| `cc-i18n list` | 列出可用語言 |
| `cc-i18n extract` | 提取 UI 字串（翻譯用） |
| `cc-i18n contribute --lang <語言>` | 產生翻譯模板 |
| `cc-i18n check-update` | 檢查 CC 更新，自動重新翻譯 |

---

## CC 更新後自動重新翻譯

Claude Code 更新會覆蓋翻譯過的檔案。加這段到 `.zshrc` 就能自動重新翻譯：

```bash
cc-i18n check-update --hook >> ~/.zshrc
source ~/.zshrc
```

---

## 安全機制

- 修改前自動備份原始檔案
- 修改後驗證：cli.js 用 `node --check` 檢查語法；執行檔則實際啟動一次 `claude --version` 確認能跑
- 驗證失敗自動還原
- 隨時可用 `cc-i18n unpatch` 完整還原

---

## 支援的 Claude Code 版本

| CC 版本 | 安裝方式 | 做法 |
|---------|---------|------|
| ≤ 2.0 | npm / Volta / nvm | 替換 `cli.js` 裡的字串 |
| ≥ 2.1（沒有 cli.js） | npm、Homebrew、native installer | 直接改寫執行檔內嵌的程式碼；檔案大小不變，macOS 自動重新簽章 |

2.1+ 的代價：每次啟動慢約 0.4 秒（預編譯快取失效）。

---

## 貢獻翻譯

```bash
# 產生空白翻譯模板
cc-i18n contribute --lang ja

# 填寫翻譯後，複製到 src/translations/
# 測試：cc-i18n patch --lang ja
# 提交 PR！
```

---

## 授權

MIT
