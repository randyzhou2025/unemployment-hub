import { writeFile, access } from "node:fs/promises";
const root = "apps/miniapp/dist/build/mp-weixin";
await access(root + "/app.json");
await writeFile(
  root + "/project.private.config.json",
  JSON.stringify(
    {
      description: "本机 HTTP 联调专用；不用于正式发版",
      projectname: "失业有数-本地调试",
      setting: { urlCheck: false },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "已写入本机调试设置：只对本项目跳过域名校验。正式发版使用 pnpm release:weapp。",
);
