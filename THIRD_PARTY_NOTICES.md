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

## 2. Google Maps iframe

- 生成结果显示后，页面默认加载 `https://www.google.com/maps?...&output=embed` iframe
- Google 会收到访问者 IP、User-Agent、Referer（受浏览器和页面 Referrer-Policy 影响）等请求元数据
- Google Maps 适用 Google 自身的服务条款、Cookie 与隐私政策

---

## 3. Random User

- 用途：通过 `https://randomuser.me/api/1.4/` 获取随机姓名和性别
- 请求由 Cloudflare Worker 服务端发出，Random User 通常看到 Cloudflare 出口而非最终访客 IP
- Random User 不支持所有项目国家的 nationality，姓名不保证与所选地址国家匹配

## 4. 第三方图床

- 页脚 GitHub 图标使用原项目的 `https://pic.imgdb.cn/item/66e7ab36d9c307b7e9cefd24.png`
- 浏览器默认加载该图片，图床会收到相应请求元数据

---

## 5. 原项目来源

- 原始项目：<https://github.com/Adonis142857/Real-Address-Generator>，MIT License，Copyright (c) 2024 Adonis142857
- 原始 README 声明："初代版本来自 chatgpt.org.uk"，但原版未提供该来源的具体许可证链接
- 本衍生版对原代码进行了实质性重写（XSS 修复、架构重构、新功能），保留原始 MIT 版权声明

---

## 6. 其他依赖说明

本项目无 npm 依赖、无构建工具、无分析/追踪 SDK、无外部字体。外部运行时依赖包括 Nominatim、Random User、Google Maps iframe 和 pic.imgdb.cn 图标。
