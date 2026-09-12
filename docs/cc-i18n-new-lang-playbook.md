# cc-i18n 新語言上線手冊

> 從 zh-TW 實戰提煉。給 CC / 下一個 AI 實例 / SHAO 自己參考。
> 最後更新：2026-03-19，CC v2.1.79，cc-i18n v1.0.0

---

## 一、架構總覽

cc-i18n 把 Claude Code 的 UI 翻譯成任何語言。CC 的介面是一個 minified JavaScript 打包檔（≤2.0 是 ~12MB 的 cli.js），所有 UI 字串都在裡面。

> **CC ≥ 2.1 沒有 cli.js**：程式碼被編進原生執行檔裡。下文所有「在 cli.js 裡 grep」的步驟，先跑 `cc-i18n dump-source --output cli.js` 把內嵌的 JavaScript（原始英文版）倒出來，再對這個檔案 grep 即可。

三層翻譯機制：

| 層 | 做什麼 | 檔案 | 數量（zh-TW 參考） |
|---|--------|------|-------------------|
| Layer 1：翻譯表 | 靜態字串 search/replace | `locales/<lang>.json` | ~1142 條 |
| Layer 2：postPatch | 動態拼接/UNSAFE/createElement 字串 | `src/core/patcher.ts` getPostPatchRules() | ~80 條 |
| Layer 3：Plugin | 讓 AI 回覆也用目標語言 | CLAUDE.md 注入 | 1 條規則 |

執行順序：unpatch（還原）→ Layer 1（map 替換）→ Layer 2（postPatch 精確替換）→ Layer 3（plugin 安裝）

---

## 二、新語言上線 SOP

### Phase 0：準備

1. **確認 CC 版本**：`claude --version`。版本升級 = minified 變數名可能變 = postPatch search 字串可能失效。
2. **確認 cli.js 路徑**：cc-i18n 自動偵測（finder.ts），但手動確認一次：`ls -la $(which claude)` 追 symlink。
3. **確認 cc-i18n 狀態**：`cd ~/Desktop/I18/cc-i18n && git status && cc-i18n --version`

### Phase 1：建翻譯表（Layer 1）

**從 zh-TW 衍生（zh-CN）：**
```bash
# 繁轉簡：用 OpenCC 或手動轉換
# 注意：部分用語繁簡不同（如「檔案」→「文件」、「資料夾」→「文件夹」）
# 不能純粹字元轉換，需要術語校對
```

**全新翻譯（en-simple）：**
```bash
# 從 zh-TW.json 的 key（英文原文）出發
# value 改成簡單英文
# 注意：key 必須精確匹配 cli.js 中的原文，一個字元都不能差
```

**翻譯表品質檢查：**
- key 是否在當前版本 cli.js 中存在（用 Phase 0 的版本跑）
- value 長度是否合理（太長會撐爆 UI layout）
- 特殊字元是否正確轉義

### Phase 2：建 postPatch rules（Layer 2）

**何時需要 postPatch：**
- 字串被 JS 引號切成多段（撇號斷句：what's → "what","'","s"）
- template literal 含變數（`Reading ${q}`）
- 三元運算式（?"Reading":"reading"）
- createElement/JSX 拆分（"Wrote ",H," lines to"）
- UNSAFE_STRINGS 中被排除的（Accept、Deny 等）
- switch/case return（case"low":return"..."）
- 複數形式（===1?"file":"files"）
- context filter 跳過的高頻詞

**postPatch rule 格式：**
```typescript
// 在 src/core/patcher.ts 的 getPostPatchRules() 中
// 每個語言有自己的區段
{
  search: '精確匹配 cli.js 中的片段',  // 必須是 minified 後的精確字串
  replace: '替換後的片段',              // 保持 JS 結構完整
},
```

**核心規則（血淚教訓）：**
1. search 必須從**當前版本** cli.js 中 grep 出來，不能手打
2. search 帶足夠上下文避免誤匹配（不只替換目標詞，包含周圍的 JS 結構）
3. 加之前先確認唯一性：`grep -c 'search字串' "$CLI"` 必須回 `1`
4. replace 只改文字部分，JS 結構（變數名、括號、運算符）原封不動

### Phase 3：驗證

**兩步驗證（缺一不可）：**

```bash
# Step 1：基本驗證
cc-i18n unpatch && cc-i18n patch --lang <lang> && claude --help 2>&1 | head -3

# Step 2：實際操作驗證（Step 1 過了才做）
claude
# 進互動模式後，跑一個寫檔操作：
# > 幫我建立 /tmp/test.txt 內容寫 hello
# > 把 /tmp/test.txt 的 hello 改成 goodbye
# 觀察：沒崩潰 + UI 字串已翻譯
```

為什麼需要 Step 2：batch74 的 3 條 postPatch 通過了 `claude --help` 和 `node --check`，但實際寫檔時 `StringSplit` 崩潰。help 只測啟動路徑，不測運行時的 diff/write 路徑。

### Phase 4：Commit

```bash
# 只 commit 改過的檔案，不用 git add -A
git add src/core/patcher.ts locales/<lang>.json
git commit -m "feat: <描述> (<lang>)"
```

---

## 三、坑清單（13 條，全部從實戰來）

### 坑 1：replaceAll 炸 HTTP 層
**現象**：替換了 HTTP header 或 API endpoint 中的英文字串，CC 無法連線。
**原因**：翻譯表的 key 太短/太通用，匹配到非 UI 區域。
**防治**：UNSAFE_STRINGS 排除清單。目前有 14 筆。不可刪減。

### 坑 2：CC 自動更新覆蓋 patch
**現象**：patch 完過幾天又變回英文。
**原因**：CC 自動更新，cli.js 被覆蓋。
**防治**：更新後重新 patch。postPatch search 字串可能也需更新（minified 變數名會變）。

### 坑 3：推知當確知
**現象**：假設某個字串是安全的就替換了，結果爆了。
**防治**：每條 postPatch 都要 grep 確認唯一性 + 實際操作驗證。不假設。

### 坑 4：postPatch search 必須精確匹配 minified
**現象**：手打的 search 字串差一個空格或變數名，匹配不到。
**防治**：永遠從 cli.js grep 出精確字串，複製貼上，不手打。

### 坑 5：shell hook 沒 timeout
**現象**：CC 啟動卡住。
**原因**：shell hook（注入 .zshrc 的函數）沒有 timeout 機制。
**防治**：shell hook 已移除，暫不加回。

### 坑 6：template literal 短片段危險
**現象**：替換了 template literal 裡的短英文片段，破壞了其他不相關的 template literal。
**防治**：postPatch search 帶完整 JSX/createElement 上下文。

### 坑 7：搬遷摘要誤診
**現象**：v3 搬遷摘要標 postPatch 為崩潰源，實際是 shell hook 阻塞。
**教訓**：診斷要到根。症狀相關 ≠ 因果相關。

### 坑 8：CC 長文字貼不進去
**現象**：直接貼長指令到 CC，被截斷或格式錯亂。
**防治**：寫檔案，CC 讀檔：
```bash
cd ~/Desktop/I18/cc-i18n
cat > instructions.md << 'EOF'
指令內容
EOF
```
CC 裡打：`讀 instructions.md 然後照做`

### 坑 9：heredoc 尾巴不要帶 ```
**現象**：shell 引號匹配被破壞。
**防治**：heredoc 內容不要有未閉合的 backtick。

### 坑 10：靜態翻譯投入產出比遞減
**現象**：高頻可見的英文幾乎都是 template literal / createElement，靜態翻譯表覆蓋不到。
**教訓**：到了 ~85% 覆蓋率之後，剩下的幾乎都需要 postPatch。

### 坑 11：UNSAFE_STRINGS 比預期多
**現象**：Accept、Add Marketplace、Settings 等常見 UI 詞被排除。
**原因**：這些詞同時出現在 API/協議層。
**防治**：用 postPatch 帶上下文精準替換。

### 坑 12：postPatch 替換可能破壞 .split() 運行時行為
**現象**：batch74 的 diff 摘要 postPatch 通過 `claude --help` 但實際使用時 `StringSplit` 崩潰（Fatal JavaScript invalid size error）。
**原因**：替換後的字串改變了某個 `.split()` 的運行時行為（minified 代碼中的隱式依賴）。
**防治**：`node --check` + `claude --help` 不夠。必須實際操作驗證。每次只加 1 條 rule，加完實際操作，確認不崩再加下一條。

### 坑 13：sed 刪行可能清空 .zshrc
**現象**：`sed -i '' '/pattern/d' ~/.zshrc` 清空了整個檔案。
**防治**：不用 sed 改 .zshrc，用 cat 重寫。

---

## 四、成功路線（P1 修復實錄）

### 背景
batch74 一次加 3 條 postPatch rule，崩潰後無法定位是哪條。revert 整批。

### 修復策略
改為每次只加 1 條，每條都走完整驗證（help + 實際操作），通過才 commit + 開下一條。

### 實際執行順序（風險由低到高）

**#2 removed（最短、最獨立）：**
```
search: 'l7.createElement(v,{dimColor:d},"removed")'
replace: 'l7.createElement(v,{dimColor:d},"已刪除")'
```
- grep 確認唯一性：1 ✅
- unpatch → patch → help：✅
- 實際操作（寫檔 + 改檔觸發 diff）：✅ 沒崩潰
- commit：de5deff

**#3 Write header：**
```
search: 'return"Write"}function'
replace: 'return"寫入"}function'
```
- grep 確認唯一性：1 ✅
- unpatch → patch → help：✅
- 實際操作（寫新檔看工具標頭）：✅「寫入」正確顯示
- commit：d48e19e

**#1 Added lines（最複雜，createElement + 三元 + 複數）：**
```
search: '"Added ",pY.createElement(v,{bold:!0},j)," ",j>1?"lines":"line"'
replace: '"新增 ",pY.createElement(v,{bold:!0},j)," ",j>1?"行":"行"'
```
- grep 確認唯一性：1 ✅
- unpatch → patch → help：✅
- 實際操作（寫檔 + 加行觸發 Added N lines）：✅「新增 2 行」正確顯示
- commit：待確認 hash

### 關鍵教訓
1. **每次只加 1 條**：崩潰時立刻知道是哪條
2. **先短後長**：短 rule 風險低，先建立信心
3. **兩步驗證**：help 只測啟動，實際操作測運行時
4. **search 從 grep 來**：不手打。變數名每版都變（bY→pY、U→d）
5. **replace 只改文字**：JS 結構原封不動
6. **唯一性確認**：`grep -c` 必須回 1。大於 1 = 會誤替換其他地方

---

## 五、minified 變數名版本對照

CC 版本升級時，minified 變數名會變。以下是已知的變數對照：

| 用途 | v2.1.78 | v2.1.79 |
|------|---------|---------|
| React createElement 前綴（diff 區） | bY | pY |
| dimColor 變數 | U | d |
| createElement 前綴（removed 區） | — | l7 |

升版時第一步：對每條 postPatch rule 的 search，在新 cli.js 中 grep。找不到 = 變數名變了，需要更新。

快速檢查腳本：
```bash
CLI="/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js"
# 把所有 postPatch search 字串 grep 一遍
# 回 0 的 = 需要更新
```

---

## 六、zh-CN 快速路線

zh-CN 從 zh-TW 衍生，不需從零開始。

### Step 1：翻譯表

```
zh-TW.json 的 key（英文原文）不變
value 做兩件事：
1. 繁轉簡（OpenCC 或手動）
2. 術語校對（繁簡用語差異）
```

常見繁簡術語差異（cc-i18n 場景）：

| 繁體 | 簡體 |
|------|------|
| 檔案 | 文件 |
| 資料夾 | 文件夹 |
| 設定 | 设置 |
| 回復/恢復 | 恢复 |
| 載入 | 加载 |
| 權限 | 权限 |
| 執行 | 执行 |
| 寫入 | 写入 |
| 新增 | 新增（相同）|
| 已刪除 | 已删除 |
| 讀取 | 读取 |
| 編輯 | 编辑 |

### Step 2：postPatch rules

在 `getPostPatchRules()` 中新增 zh-CN 區段。search 字串跟 zh-TW 完全一樣（同一個 cli.js），只有 replace 的中文不同。

### Step 3：patcher.ts 支援

確認 `cc-i18n patch --lang zh-CN` 的語言路由有接上。看 `src/commands/patch.ts` 和 `src/core/patcher.ts` 怎麼讀 locale。

---

## 七、en-simple 路線

全新翻譯方向，不是語言轉換而是語言簡化。

### 定位
把 CC 的技術英文改成小學生能讀懂的英文。例如：
- "Permission denied" → "You can't do this"
- "Resuming conversation" → "Going back to where we left off"
- "Execute" → "Run"

### 挑戰
1. key 和 value 都是英文 → 替換可能造成非預期的二次匹配
2. 簡化後的字串可能更短或更長 → UI layout 影響
3. 需要大量人工校對（AI 簡化不一定符合小學生直覺）

### 建議
1. 先做 Layer 1 翻譯表，跑 patch 看覆蓋率
2. postPatch 從 zh-TW 的 rule 結構複製，只改 replace 的文字
3. 驗證同 zh-TW：help + 實際操作

---

## 八、架構決策（守住）

1. 穩定 > 覆蓋率
2. UNSAFE_STRINGS 排除清單不變
3. postPatch search 帶完整 JSX 上下文
4. 每次 postPatch 只加 1 條 → 實際操作驗證 → 再加下一條
5. 驗證 = `claude --help` + 實際操作（兩步缺一不可）
6. CC 長文字用檔案餵
7. 不用 sed 改 .zshrc
8. git commit 只加具體檔案（不用 `git add -A`）
9. postPatch search 從 grep 來，不手打
10. CC 版本升級後先 grep 所有 postPatch search 確認仍匹配

---

## 九、當前狀態速查

| 項目 | 值 |
|------|-----|
| CC 版本 | v2.1.79 |
| cc-i18n 版本 | v1.0.0 |
| cli.js 路徑 | /opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js |
| 安裝方式 | Homebrew（npm global）|
| Applied（zh-TW） | 1187 |
| 翻譯表命中率 | 99.4%（7 筆舊版殘留）|
| postPatch rules | ~80+ 條 |
| Shell hook | ❌ 已移除 |
| Native installer | 未遷移（底部黃字為提醒，非已切換）|
