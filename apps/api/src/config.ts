import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3070),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().min(16),
  WECHAT_MINI_APPID: z.string().regex(/^wx[a-zA-Z0-9]{16}$/).optional(),
  WECHAT_MINI_SECRET: z.preprocess(v => v === "" ? undefined : v, z.string().min(16).optional()),
  PADMIN_GATEWAY_SECRET: z.preprocess(v => v === "" ? undefined : v, z.string().min(32).optional()),
  ADMIN_ORIGINS: z.string().default("http://localhost:3071"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});
export type Config = z.infer<typeof schema>;
export function readConfig() {
  return schema.parse(process.env);
}
