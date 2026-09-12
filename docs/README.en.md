[中文](../README.md) | English

# cc-i18n — Translate Claude Code into Any Language

Translate the entire Claude Code interface into Chinese (or any language).

One-line install, zero token cost, auto-repairs after CC updates.

## What It Does

Before: All menus, buttons, and prompts are in English
After: Everything in your language — completely different experience

> Currently 1480+ strings translated, covering buttons, menus, status bar, error messages, tool tips, and more.

## Install in 3 Steps

```bash
# 1. Install the tool
npm install -g cc-i18n

# 2. Apply Chinese (Traditional)
cc-i18n patch --lang zh-TW

# 3. Install auto-repair (survives CC updates)
cc-i18n install-wrapper
```

Run `claude --help` — if you see Chinese, you're done.

## Will It Break When CC Updates?

**No.** The auto-repair system (three-layer defense) keeps your translations alive:

| Layer | How It Works | When It Protects You |
|-------|-------------|----------------------|
| Wrapper | Checks before every `claude` launch | The moment you start CC |
| Sentinel | Background file watcher on CC install dir | The second the CC binary (or cli.js) gets replaced |
| CC Hook | SessionStart hook re-verifies | During CC's internal startup |

All three layers are independent. If one breaks, the other two still protect you.

## Supported Languages

| Language | Code | Status |
|----------|------|--------|
| Traditional Chinese | zh-TW | Complete |
| Simplified Chinese | zh-CN | Syncing |
| Simple English | en-simple | Planned |

Want to add a new language? Contributions welcome! See [New Language Guide](cc-i18n-new-lang-playbook.md).

## All Commands

```bash
cc-i18n patch --lang zh-TW    # Apply translation
cc-i18n unpatch                # Restore English
cc-i18n status                 # Check status
cc-i18n install-wrapper        # Install auto-repair wrapper
cc-i18n install-sentinel       # Install background sentinel (optional)
```

## FAQ

**Q: Does it cost extra tokens?**
A: No. Translations are applied locally by replacing UI strings. Zero API cost.

**Q: Does it affect CC functionality?**
A: No. Only UI text is changed — no logic code is touched. Unsafe strings (HTTP headers, etc.) are automatically excluded.

**Q: How do I update translations?**
A: `npm update -g cc-i18n && cc-i18n patch --lang zh-TW`

**Q: Does it support native installer CC?**
A: Yes. npm, Homebrew and native-installer (`curl -fsSL https://claude.ai/install.sh | bash`) installations are all detected.

**Q: Claude Code 2.1+ no longer ships cli.js. Does it still work?**
A: Yes. Since 2.1 Claude Code is a single compiled executable; cc-i18n rewrites the JavaScript embedded in that executable in place (file size unchanged), re-signs it ad hoc on macOS, then launches it once to make sure it starts — restoring the original on any failure. The cost is ~0.4 s slower startup.

## How It Works

cc-i18n uses two translation layers:

1. **Static translation map**: 1440+ English-to-target pairs, direct string replacement
2. **postPatch rules**: Handles JSX/createElement dynamic strings with context-aware precision replacement

No logic changes — only display text. Auto-backup before patching, unpatch anytime to restore.

**CC 2.1+ (native executable)**: the bundle is compiled into a Bun single-file executable. cc-i18n parses the module table inside the binary and writes the translated modules back into the same region (size and section layout unchanged) — see `src/core/bun-binary.ts`.

## Contributing

PRs welcome! Especially:
- New language translations
- Translation corrections
- Support for new CC versions

## License

MIT
