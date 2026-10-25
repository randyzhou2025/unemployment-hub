import { readConfig } from "./config.js";
import { connect } from "./db/client.js";
import { createApp } from "./app.js";
const config = readConfig();
const { client, db } = connect(config.DATABASE_URL);
const app = await createApp(db, config);
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    void app.close().then(() => client.end());
  });
await app.listen({ host: config.HOST, port: config.PORT });
console.log(`API http://localhost:${config.PORT}`);
