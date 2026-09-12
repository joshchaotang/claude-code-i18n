[English](docs/README.en.md) | 中文

# cc-i18n — 讓 Claude Code 說中文

把 Claude Code 的整個介面翻譯成中文（或任何語言）。

一行安裝，零 token 消耗，CC 更新後自動修復。

## 效果

安裝前：所有選單、按鈕、提示都是英文
安裝後：全部變中文，操作體驗完全不同

> 目前翻譯了 1480+ 個字串，涵蓋 CC 的按鈕、選單、狀態列、錯誤訊息、工具提示等。

## 三步安裝

```bash
# 1. 安裝工具
npm install -g cc-i18n

# 2. 套用中文
cc-i18n patch --lang zh-TW

# 3. 裝自動修復（CC 更新後自動恢復中文）
cc-i18n install-wrapper
```

裝完打 `claude --help`，看到中文就成功了。

## CC 更新後會不會失效？

**不會。** 安裝了自動修復機制（三層防禦），CC 怎麼更新都不影響：

| 防線 | 原理 | 什麼時候保護你 |
|------|------|----------------|
| Wrapper | 每次打 `claude` 前自動檢查 | 你啟動 CC 的那一刻 |
| Sentinel | 背景監控 CC 安裝目錄 | CC 本體（執行檔或 cli.js）被換的那一秒 |
| CC Hook | CC 啟動時再確認一次 | CC 內部啟動流程中 |

三層獨立運作，任一層壞了其他兩層照顧你。

## 支援語言

| 語言 | 代碼 | 狀態 |
|------|------|------|
| 繁體中文 | zh-TW | 完整 |
| 簡體中文 | zh-CN | 同步中 |
| 簡單英文 | en-simple | 規劃中 |

想加新語言？歡迎貢獻！看 [新語言指南](docs/cc-i18n-new-lang-playbook.md)。

## 所有指令

```bash
cc-i18n patch --lang zh-TW    # 套用翻譯
cc-i18n unpatch                # 恢復英文
cc-i18n status                 # 查看狀態
cc-i18n install-wrapper        # 安裝自動修復 wrapper
cc-i18n install-sentinel       # 安裝背景哨兵（可選）
```

## 常見問題

**Q：會消耗更多 token 嗎？**
A：不會。翻譯是在你的電腦上直接替換 UI 字串，跟 API 無關。零消耗。

**Q：會不會影響 CC 的功能？**
A：不會。只改介面文字，不碰任何邏輯代碼。UNSAFE 字串（HTTP headers 等）自動排除。

**Q：怎麼更新翻譯？**
A：`npm update -g cc-i18n && cc-i18n patch --lang zh-TW`

**Q：支援 native installer 版的 CC 嗎？**
A：支援。npm、Homebrew、native installer（`curl -fsSL https://claude.ai/install.sh | bash`）安裝的 CC 都會自動找到。

**Q：Claude Code 2.1 之後沒有 cli.js 了，還能翻譯嗎？**
A：可以。2.1 起 CC 是一個編譯好的執行檔，cc-i18n 會直接改寫執行檔裡內嵌的程式碼（檔案大小不變），macOS 上會自動重新簽章，改完還會實際啟動一次確認能跑，失敗就自動還原。代價是每次啟動慢約 0.4 秒。

## 原理

cc-i18n 用兩層翻譯：

1. **靜態翻譯表**：1440+ 條英中對照，直接字串替換
2. **postPatch 規則**：處理 JSX/createElement 等動態字串，用上下文感知的精確替換

不改邏輯，只改顯示文字。patch 前自動備份，隨時可 unpatch 恢復。

**CC 2.1+（原生執行檔）**：CC 不再附 `cli.js`，整包程式被編進一個 Bun 執行檔。cc-i18n 會解析執行檔內的模組表，把翻譯後的程式碼寫回原本的位置（檔案大小與結構都不變），詳見 `src/core/bun-binary.ts`。

## 貢獻

歡迎 PR！特別歡迎：
- 新語言翻譯
- 修正翻譯錯誤
- 支援新版 CC

## License

MIT
