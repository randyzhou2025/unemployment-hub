import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3070),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.preprocess(v => v === "" ? undefined : v, z.string().min(16).optional()),
  WECHAT_MINI_APPID: z.string().regex(/^wx[a-zA-Z0-9]{16}$/).optional(),
  WECHAT_MINI_SECRET: z.preprocess(v => v === "" ? undefined : v, z.string().min(16).optional()),
  PADMIN_GATEWAY_SECRET: z.preprocess(v => v === "" ? undefined : v, z.string().min(32).optional()),
  ADMIN_ORIGINS: z.string().default("http://localhost:3071"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
}).superRefine((config, ctx) => {
  if (!config.PADMIN_GATEWAY_SECRET && (config.NODE_ENV === "production" || !config.ADMIN_PASSWORD)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PADMIN_GATEWAY_SECRET"], message: "请配置 padmin 管理连接密钥" });
  }
});
export type Config = z.infer<typeof schema>;
export function readConfig(environment: Record<string, string | undefined> = process.env) {
  return schema.parse(environment);
}
