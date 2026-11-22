# 原始模块说明 — original modules

这里是从 Claude Desktop 安装包里原样取出的 3 个文件，**只作归档与对照**，版权归 Anthropic（见 [../NOTICE.md](../NOTICE.md)）。

Three files copied verbatim out of the shipped bundle, kept **for archival reference only**.
Copyright Anthropic PBC — see [../NOTICE.md](../NOTICE.md).

| 文件 | 是什么 |
|---|---|
| `cf2613ee5-ChHJeJxJ.js` | 旧版星芒定义。导出 `animations`，包含 `thinking` `writing` `waiting` `shimmer` `entrance` `exit` `orbiting` `tickle` 共 8 个状态，每个状态是 `{svg, width, height, frameCount, speed}`。`svg` 是竖排的帧条（`thinking` 为 `viewBox="0 0 100 900"` = 9 帧）。 |
| `c8677db5f-BKTojXqv.js` | 新版散点定义。导出 `SHEETS` `SHEET_URLS` `SHEET_FRAME`（`SHEET_FRAME = 48`）。`blocked/code/default/quill/read/search/think/write` 各有 `.in/.loop/.out` 三段，`think.loop` 为 110 帧 @33.33ms。 |
| `cfdbc338b-DzLBZ8y5.webp` | 新版 `think.loop` 的实际图像：48×5280 = 110 帧竖排，带 alpha。 |

## 怎么验证这些就是官方原样

```bash
# 直接从你的安装包里重新取出，和本目录逐字节比对
python3 ../tools/extract-asar.py \
  "/Applications/Claude.app/Contents/Resources/ion-dist.asar" \
  extract /tmp/verify /assets/v1/cf2613ee5
shasum -a 256 /tmp/verify/assets/v1/cf2613ee5-*.js cf2613ee5-ChHJeJxJ.js
```

## 版本对应

取自 `Claude Desktop 6.28899.6`（`com.anthropic.claudefordesktop`），内置 Claude Code `2.1.330`。
文件名里的 hash 是 Vite 构建生成的，**下次更新会变**，所以 `tools/rebuild.mjs` 是按内容定位模块，不是按文件名。
