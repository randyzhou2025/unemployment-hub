# 失业有数 · UnemploymentHub

失业有数小程序覆盖离职准备、刚失业、失业持续期、求职与转型、重新就业五个阶段，提供资讯、政策导航和实用工具。

仓库：[randyzhou2025/unemployment-hub](https://github.com/randyzhou2025/unemployment-hub)。本项目已确定为正式方案，代码目录为 `/Users/Randy/Cursor/UnemploymentHub`。

## 本地开发

使用 Node 24.22.0、pnpm 10.33.0；本地 PostgreSQL 使用 Docker。

```bash
cd /Users/Randy/Cursor/UnemploymentHub
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

| 服务 | 本机 | 当前局域网 |
| --- | --- | --- |
| 小程序 H5 辅助预览 | http://localhost:3072/ | http://192.168.1.108:3072/ |
| 独立运营工作台 | http://localhost:3071/ | http://192.168.1.108:3071/ |
| API 就绪检查 | http://localhost:3070/api/health/ready | http://192.168.1.108:3070/api/health/ready |
| padmin 用户管理（另启 XueXiDaZi） | http://localhost:8090/padmin/unemployment/users | http://192.168.1.108:8090/padmin/unemployment/users |

后台初始用户名 `admin`，本机密码保存在 `apps/api/.env`。环境文件不纳入 Git。换网络后，按实际地址更新 `apps/miniapp/.env.local` 的 `VITE_API_BASE`。

## 微信端运行

```bash
pnpm build:weapp:local
```

微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin`，AppID 为 `wx4705822b30adb794`。本地构建仅对生成目录跳过域名检查。正式发布配置 HTTPS API 后使用 `pnpm release:weapp`，再进行真机验收、上传、审核和发布。

## 当前功能

- 首页板块：后台配置显示、排序和入口，提供搜索与资讯推荐。
- 失业金：地区政策卡片、申领要点、来源、相关资讯，以及按官方核定月数试算金额。
- 社保医保：方案选择、方案详情、费用比较，后台维护城市与政策。
- 培训补贴：项目、等级、补贴参考金额、报名与费用说明。
- 阶段指南、行动清单、收藏、预算和求职进度记录。
- 微信自动建号、默认昵称及注册与基础活跃统计。真实微信登录需在服务端配置独立 AppSecret。
- padmin 统一管理用户、活跃、内容、政策、板块、工具、反馈及操作记录。

个人记录仍保存在本机；目前不提供个人记录云同步或政策资格认定。

## 数据与版本管理

| 数据 | 位置 |
| --- | --- |
| 资讯、来源、政策、板块、用户和活跃 | PostgreSQL `unemployment_hub`，本机端口 `5438` |
| 本机数据库持久卷 | `unemployment-hub-local-data` |
| 任务、收藏、预算、求职记录和偏好 | 微信/设备本机 Storage，保留现有 `uhb:v1:` 键前缀，改名不清除记录 |
| 首页插画、图标及缩略图 | `apps/miniapp/src/static/blue/`，随包发布 |
| AppSecret、后台密码、连接密钥 | 仅服务端环境文件，禁止提交到 Git |

Git 管理源码、依赖锁文件、部署配置、文档和必需的包内素材；依赖目录、编译输出、私密配置、数据库备份与验收截图不提交。

## 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm build:h5
```

本机调试包构建后可运行 `node scripts/prepare-weapp-local.mjs` 恢复本项目的本地调试配置。构建或模拟器验收不代表真机及线上已验收。

## 部署与运营

服务器首次 `git clone`，以后 `git pull --ff-only`；服务器项目目录为 `/opt/unemployment-hub`，padmin 复用 `/opt/xuexidazi`。

- [部署上线指南：上线三步](docs/部署上线指南.md)
- [用户体系与 padmin 接入](docs/用户体系与padmin接入.md)
- [首页板块与失业金运营指南](docs/首页板块与失业金运营指南.md)
- [社保医保模块运营指南](docs/社保医保模块运营指南.md)
- [培训补贴模块运营指南](docs/培训补贴模块运营指南.md)

`pnpm export:padmin` 用于本机联调时导出工作台到相邻的 XueXiDaZi 项目。生产环境从失业有数 API 镜像复制构建好的工作台，再构建 padmin，详见部署指南。
