# 失业有数：用户体系与 padmin 接入

## 本次实现

微信端首次进入时自动连接账号，生成默认昵称；再次进入继续使用同一账号，不要求填写手机号、头像或昵称。账号连接失败时，公开资讯和本机工具仍可使用。

- 独立用户库：以本小程序 AppID + OpenID 唯一识别，不与课本单词通或学习搭子合并用户。
- 服务端保存：用户编号、微信标识、默认昵称、注册与最近访问时间，以及每天的首次访问、最近访问和访问次数。
- 本机保存：任务、收藏、预算、求职记录、内容偏好。不上传这些数据，也不把访问记录关联到具体资讯或个人情况。
- 小程序会话有效期 30 天，服务端只保存令牌摘要。微信返回的 session_key 不存储、不下发；AppSecret 只保存在服务端。
- 活跃按北京时间自然日去重。首次连接算一次访问，前台恢复最短间隔 5 分钟；同一天内多次访问累计次数，人数只计一次。它是有效账号连接次数，不代表每次点击或完整停留时长。

padmin 新增「失业有数」分组，包含用户管理、访问活跃、资讯与指南、资料来源、失业金政策、社保医保政策、培训补贴、首页板块、工具管理、用户反馈、操作记录。用户页支持搜索和分页，显示脱敏微信标识；活跃页可按日期查看。

内容管理复用现有编辑器，保留原有草稿、审核、发布、版本冲突校验及操作审计。嵌入后隐藏独立导航和第二次登录。管理员通过 padmin 原有账号登录，服务端核验管理员后签名转发；不把共享密钥交给浏览器。

## 本地配置与入口

代码目录：

- 失业有数：`/Users/Randy/Cursor/UnemploymentHub`
- padmin：`/Users/Randy/Cursor/XueXiDaZi`

本地 API 数据迁移已执行 `0002_mini_accounts.sql`，为增量新增三张表，不修改既有内容表。

`apps/api/.env`：

```dotenv
WECHAT_MINI_APPID=wx4705822b30adb794
WECHAT_MINI_SECRET=
PADMIN_GATEWAY_SECRET=
```

XueXiDaZi `.env`：

```dotenv
UNEMPLOYMENT_API_ORIGIN=http://127.0.0.1:3070
UNEMPLOYMENT_GATEWAY_SECRET=
```

两边本地管理连接密钥已生成且一致。`WECHAT_MINI_SECRET` 尚未配置：请在服务端文件中填写独立小程序的 AppSecret，不要发送到聊天，也不要写入小程序环境变量。配置后完整重启 API 进程，单纯保存源文件不能保证环境变量重新加载。

```bash
cd /Users/Randy/Cursor/UnemploymentHub
pnpm db:migrate
pnpm export:padmin
pnpm dev
```

另开终端：

```bash
cd /Users/Randy/Cursor/XueXiDaZi
npm run build
npm run dev:server
```

已有服务运行时不重复启动。入口：

- padmin 用户：<http://localhost:8090/padmin/unemployment/users>
- padmin 资讯：<http://localhost:8090/padmin/unemployment/contents>
- LAN 用户：<http://192.168.1.108:8090/padmin/unemployment/users>（本机当前局域网地址）
- 编辑器开发预览（仅开发）：<http://localhost:3071/>

开发 padmin React 页面可另运行 `npm run dev:padmin`，访问 `http://localhost:5175/padmin/`；该开发服务器已代理管理 API 和嵌入工作台。

每次修改后台后执行 `pnpm export:padmin`，导出的工作台位于 `XueXiDaZi/integrations/unemployment-workbench/`。这是构建产物，不纳入 Git。服务器按部署指南从 API 镜像复制工作台，再构建 padmin。

## 生产发布

生产只通过 padmin 登录，不需要配置独立后台用户名、密码或管理域名。数据库连接由 Compose 自动生成，最少只需数据库密码、AppID、微信 AppSecret 和 padmin 连接密钥。生产 API 拒绝独立登录和历史独立后台 Cookie。

统一按 [部署上线指南：上线三步](部署上线指南.md) 执行。新项目目录为 `/opt/unemployment-hub`，padmin 沿用服务器已有的 `/opt/xuexidazi`。该指南已包含本机内容迁移、服务端密钥、Docker 网络和微信发布步骤。

## 常见排查

| 现象 | 检查位置 |
| --- | --- |
| 资讯正常但用户一直为 0 | 是否填写独立 AppSecret；是否完整重启 API；是否确实从微信小程序进入（H5 不创建微信账号） |
| 后台显示「管理连接校验失败」 | 两边密钥是否一致；API 是否仍使用旧环境；两台服务器时间是否同步 |
| 「失业有数后台连接尚未配置」 | XueXiDaZi 环境中是否提供 API origin 和管理密钥 |
| 工作台 404 | 是否执行导出并随 XueXiDaZi 上传资源、重新构建容器 |
| 工作台重复要求登录 | 是否从 padmin 内打开，padmin 令牌是否有效；不要手工改为跨域 iframe |
| padmin 502 | 健康检查、Docker 网络和 `unemployment-api:4000` 是否可达 |

账号及访问表与内容一起纳入原有 PostgreSQL 备份。升级只新增表，不需要重新导入资讯或重置管理员。
