<div align="center">

<img src="public/images/ulinktek-logo.png" alt="优联科技 Ulinktek" height="72">

# 优联科技（深圳）有限公司 · Ulinktek

**工业管道内窥镜、下水道检测摄像机与管道检测爬行机器人制造商**

🌐 官方网站：**[www.szulink.com.cn](https://www.szulink.com.cn/)**

[![Website](https://img.shields.io/badge/官网-szulink.com.cn-0a66c2)](https://www.szulink.com.cn/)
[![Products](https://img.shields.io/badge/产品中心-查看-1f883d)](https://www.szulink.com.cn/zh/products)
[![Contact](https://img.shields.io/badge/联系我们-询盘-e36209)](https://www.szulink.com.cn/zh/contact)

</div>

---

## 公司简介

**优联科技（深圳）有限公司**（品牌 **Ulinktek / 优联**）位于广东深圳，是一家专注于**管道检测定位设备与特种机器人**研发、制造和销售的**国家高新技术企业**和**专精特新“小巨人”企业**。

公司具备从研发、结构与电子设计到生产制造的完整自主能力，产品覆盖工业管道内窥镜、下水道检测摄像机、管道检测爬行机器人、管道定位器，以及通风管道检测与清扫机器人，广泛服务于**市政排水、建筑运维、工业管道检测和通风系统维护**等场景，并支持 **OEM / ODM 定制**。

## 产品线

| 类别 | 说明 |
| --- | --- |
| 推杆式管道检测系统 | 小口径、家用排水管道内窥镜，便携式管道 / 下水道检测系统 |
| 市政与工业检测系统 | 面向市政排水与工业管道的中大型检测设备 |
| 管道检测爬行机器人 | 如 UL-150H 等 CCTV 管道爬行机器人 |
| 云台与远距离检测 | 云台摄像系统、潜望镜 / 杆式管道检测 |
| 手持内窥镜 | 工业手持式内窥检测设备 |
| 管道定位器 | 配合检测系统进行地下管线与探头定位 |
| 通风管道机器人 | 通风管道检测与清扫机器人 |
| 摄像头与配件 | 摄像头、线缆与线盘、控制器、弹簧组件、视频线、电池与适配器等 |

代表型号：**UL-150H**、**3688CH**、**5D3PRO**、**3188DN** —— 详见 [产品中心](https://www.szulink.com.cn/zh/products)。

## 官网入口

| 页面 | 链接 |
| --- | --- |
| 官网首页 | <https://www.szulink.com.cn/> |
| 产品中心 | <https://www.szulink.com.cn/zh/products> |
| 管道检测知识库 | <https://www.szulink.com.cn/zh/knowledge> |
| 资源中心（视频 / 软件下载） | <https://www.szulink.com.cn/zh/resources> |
| 技术论坛 | <https://www.szulink.com.cn/zh/forum> |
| 关于我们 | <https://www.szulink.com.cn/zh/about> |
| 联系我们 | <https://www.szulink.com.cn/zh/contact> |

## 联系方式

- **全国服务热线**：0755-84416462
- **商务邮箱**：[marketing@ulinktek.com](mailto:marketing@ulinktek.com)
- **公司地址**：深圳市龙岗区南湾街道下李朗社区布澜路21号联创科技园5栋
- **在线询盘**：<https://www.szulink.com.cn/zh/contact>

---

## 关于本仓库

本仓库是 [szulink.com.cn](https://www.szulink.com.cn/) 官网的**前端框架（脱敏版）**，仅用于展示官网的技术实现。仓库不包含任何生产密钥、服务器地址、运维文档或后台数据；所有内容（产品、文章、导航、站点配置）在运行时由独立的后台 API 提供，本仓库不含后端代码。

### 技术栈

- **Nuxt 4 / Vue 3 / TypeScript**，Nitro `node-server` 预设，请求时 SSR
- IIS（URL Rewrite + ARR）作为公网入口，反向代理 Nuxt Node 服务与后台 API
- PrimeVue（unstyled）、lucide 图标、高德地图 JS API
- 全站使用 OPPO Sans 4.0 字体（许可见 `public/fonts/`）

### 功能模块

- 产品中心：分类筛选、产品详情、图库与响应式图片
- 管道检测知识库：分类、分页、文章详情
- 资源中心：产品视频与软件下载
- 技术论坛：分类、帖子、评论、用户主页、注册登录
- 关于我们、证书资质、联系我们（地图 + 在线询盘）
- SEO / GEO：canonical、Open Graph、`Product` / `Article` / `BreadcrumbList` JSON-LD，动态生成 `sitemap.xml`、`robots.txt`、`llms.txt`

### 目录结构

```text
pages/        路由页面（pages/zh/* 为中文站）
components/   页面组件
composables/  API 访问、SEO、会话等组合式函数
shared/       内容 / 论坛 / 询盘的数据契约与净化逻辑
server/       Nitro 服务端路由（sitemap、robots、llms.txt、健康检查等）
public/       静态资源与 IIS web.config
scripts/      构建后 IIS 配置生成、本地预览网关、SEO 冒烟测试
tests/        node:test 单元测试
docs/         架构与 API 集成说明
```

### 本地运行

```bash
npm ci
cp .env.example .env   # 按需修改为你自己的后台 API 地址
npm run dev -- --port 3001
```

本项目依赖配套后台 API 才能显示内容；未连接后台时页面会返回 503。接口契约见 [docs/architecture.md](docs/architecture.md) 与 [docs/integration-guide.md](docs/integration-guide.md)。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run typecheck` | Nuxt / Vue 类型检查 |
| `npm test` | 运行单元测试 |
| `npm run build` | 构建 `.output` 并生成 IIS `web.config` |
| `npm run preview` | 本地模拟 IIS 网关预览构建产物 |

## 版权说明

© 优联科技（深圳）有限公司。“优联”“Ulinktek”名称与标志为公司所有。第三方依赖与字体许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 `public/fonts/OPPO-Sans-4.0-LICENSE.txt`。
