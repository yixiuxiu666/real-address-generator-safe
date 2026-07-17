# Real Address Generator — 安全重构版（含新加坡、荷兰支持）

**本项目是 [Real-Address-Generator](https://github.com/Adonis142857/Real-Address-Generator) 的安全重构衍生版。**  
原作者：Adonis142857（初代版本来自 chatgpt.org.uk）。  
衍生版作者：安全审查重构，仅修改安全性与功能，不代表原作者立场。  
许可证：MIT（保留原始 LICENSE 文件与版权说明）。

本工具主要面向开发者、测试人员、教育工作者和研究人员，为软件开发、质量保障、教学演示及合规研究提供高质量的测试数据。

---

## ⚠️ 重要数据说明

- **地址**：坐标来自 OpenStreetMap，反向地理编码后得到的地址**可能对应真实住宅或商业住户**。数据来源为公共地图数据库，并非专为测试创建。
- **姓名**：由 [Random User](https://randomuser.me/) 外部服务随机生成，通常不与所选地址国家匹配，也不应视为真实身份资料。
- **电话**：格式示例，**随机生成，可能对应真实用户，切勿拨打**。
- **禁止用途**：不得用于欺诈、身份冒充、KYC 绕过、骚扰电话或任何违法行为。

---

## 与原版的主要差异

| 项目 | 原版 | 本重构版 |
|---|---|---|
| XSS | 上游值直接拼接 HTML/内联 JS | JSON API + 前端 DOM，无动态 HTML 拼接 |
| CSP | 无 | strict CSP + nosniff + Referrer-Policy 等 |
| country 验证 | 无 allowlist，TypeError crash | 统一 allowlist，非法值 400 |
| HTTP 方法 | 不限制 | 仅 GET/HEAD，其他 405 |
| Nominatim 调用次数 | 最多 100 次/请求 | 最多 3 次实时查询；失败时从成功地址池回退 |
| 外部 fetch 超时 | 无 | AbortSignal 4.5 s |
| 缓存 | 无 | Cache API 坐标网格缓存 + 按国家划分的成功地址池，不缓存错误 |
| 姓名来源 | randomuser.me（外部依赖） | randomuser.me（固定 API 版本、超时与响应校验） |
| 新加坡支持 | 无 | 6 个陆地区域中心、+65 电话、6 位邮编校验 |
| 荷兰支持 | 无 | 5 个城市采样中心、+31 测试电话、荷兰邮编校验 |
| 地图 | 默认加载 Google Maps iframe | 默认加载 Google Maps iframe，并通过 CSP 限定来源 |
| 第三方图片 | 第三方图床 GitHub 图标 | 保留原第三方图床 GitHub 图标，并通过 CSP 限定来源 |
| localStorage 清除 | 无 | 提供清空按钮和隐私说明 |
| Worker 语法 | Service Worker 语法 | ES Module Worker（Wrangler 可复现部署） |
| 测试 | 无 | Node 内置 `node:test` 单元测试 |

---

## 架构

```
worker.js          — 单文件 ES Module Worker（服务端逻辑 + 内联 HTML/CSS/JS）
wrangler.jsonc     — Wrangler 部署配置（非必须，手动复制部署也可）
test/worker.test.mjs — Node 内置 test 单元测试
LICENSE            — MIT（原版，保留不变）
THIRD_PARTY_NOTICES.md — 第三方数据与服务说明
README.md          — 本文件
```

**无 npm 依赖**，无构建步骤，单文件即可部署。

---

## 部署方法

### 方法 A：Wrangler CLI（推荐，可复现）

```bash
npm install -g wrangler
# 修改 wrangler.jsonc 中的 vars（User-Agent、Referer、域名）
wrangler deploy
```

### 方法 B：Dashboard 手动复制

1. 登录 Cloudflare → Workers & Pages → Create Worker
2. 将 `worker.js` 全文复制进编辑器
3. 在 Settings → Variables 添加环境变量：
   - `NOMINATIM_USER_AGENT`：你的应用标识（必填）
   - `NOMINATIM_REFERER`：你的部署 URL
4. 保存并部署

---

## Nominatim / 公共地理编码服务限制

**本项目使用 [Nominatim 公共实例](https://nominatim.openstreetmap.org/)，请务必阅读以下说明：**

- 公共 Nominatim [使用政策](https://operations.osmfoundation.org/policies/nominatim/) 要求：
  - 全局流量**绝对上限 1 req/s**（跨所有访客的应用级总量）
  - 必须提供可识别的真实 `User-Agent` 和 `Referer`
  - 必须缓存结果，避免重复查询同一坐标
  - 必须显示 OpenStreetMap attribution（本项目已在页面和 README 中提供）
- **本项目每次生成最多进行 3 次实时 Nominatim 查询。** 查询成功后，只把地址文本和坐标写入按国家划分的 Cache API 成功地址池（最多 100 条、自动去重）；3 次均失败时优先从该国地址池随机回退。姓名、电话、备注不会写入地址池。地址池属于边缘缓存，可能被 Cloudflare 淘汰，不是永久数据库。
- 坐标缓存和成功地址池能减少失败率及重复请求，但**无法保证跨所有访客的全局 1 req/s 限制**。公开部署仍需控制整体流量。
- **生产环境强烈建议：** 使用自建 Nominatim 实例或商业地理编码服务（如 [Geocodio](https://www.geocod.io/)、[LocationIQ](https://locationiq.com/)、[Geoapify](https://www.geoapify.com/) 等），并通过 `NOMINATIM_BASE_URL` 环境变量切换。
- 如果公共 Nominatim 限流/封禁你的 Worker 出口 IP，属于**你的部署责任**，与本项目代码无关。

---

## 开发与测试

```bash
# 语法检查
node --check worker.js

# 运行测试
node --test test/worker.test.mjs

# 或直接（Node 24+）
node --test
```

测试覆盖：SG/NL 配置与地址格式、非法 country 返回 400、方法限制、XSS payload 不进入可执行 HTML、Random User 响应、外部 fetch 失败/超时错误处理、最多 3 次实时查询、成功地址池写入/去重/回退、坐标缓存命中模拟。

---

## 第三方与数据来源

详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

地址数据 © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，[ODbL](https://opendatacommons.org/licenses/odbl/)。  
地理编码由 [Nominatim](https://nominatim.org/) 提供。
