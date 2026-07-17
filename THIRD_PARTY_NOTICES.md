# Third-Party Notices / 第三方声明

本项目的代码使用 MIT 许可证（见 LICENSE），但依赖以下第三方数据源和服务，各自适用独立的许可证和服务条款。

---

## 1. OpenStreetMap / Nominatim

- **用途**：将随机坐标反向地理编码为街道地址（在服务端发起请求）
- **地理编码服务**：[Nominatim](https://nominatim.org/)，由 OpenStreetMap Foundation 维护
- **数据版权**：© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- **数据许可**：[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/)
- **Attribution 要求**：ODbL 要求在使用 OSM 数据的产品中展示"© OpenStreetMap contributors"及链接。本项目在页面底部和本文件中提供此署名。
- **Nominatim 使用政策**：<https://operations.osmfoundation.org/policies/nominatim/>
  - 公共实例全局上限 1 req/s（应用级）
  - 必须提供可识别的 User-Agent 和 Referer
  - 必须缓存，避免重复查询
  - **本项目不能在代码层面保证跨多访客的全局速率，生产部署应使用自建 Nominatim 或商业 geocoder**
- **地址数据说明**：OSM 地址数据来自协作编辑，可能对应真实住宅。本项目不对地址准确性或投递性作任何保证。

---

## 2. 地图链接（用户主动点击后）

- 本项目在用户点击"在 OpenStreetMap 打开"按钮后，在**新标签页**打开 `https://www.openstreetmap.org/` 地图链接
- 仅在用户主动操作时发生；核心页面不加载任何第三方 iframe 或地图瓦片
- OpenStreetMap 网站适用其[隐私政策](https://wiki.osmfoundation.org/wiki/Privacy_Policy)和服务条款

---

## 3. 虚构姓名

- 姓名完全由本项目内置的静态名字池生成，**无外部 API 依赖**
- 不对应任何真实人物；多族群名字（中文、马来文、印度文等）仅为格式示例，不代表对任何族群的刻板印象

---

## 4. 原项目来源

- 原始项目：<https://github.com/Adonis142857/Real-Address-Generator>，MIT License，Copyright (c) 2024 Adonis142857
- 原始 README 声明："初代版本来自 chatgpt.org.uk"，但原版未提供该来源的具体许可证链接
- 本衍生版对原代码进行了实质性重写（XSS 修复、架构重构、新功能），保留原始 MIT 版权声明

---

## 5. 无其他第三方依赖

本项目无 npm 依赖，无构建工具，无分析/追踪 SDK，无外部字体，无外部图片。所有页面资产由 Worker 直接内联提供。
