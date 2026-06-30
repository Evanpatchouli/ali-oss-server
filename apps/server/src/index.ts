import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { initializeRuntimeState } from "./services/runtime-state-service.js";

await initializeRuntimeState();

const app = createApp();

app.listen(config.port, () => {
  console.log(`OSS server is listening on http://localhost:${config.port}`);
  console.log(`Admin panel is available at http://localhost:${config.port}/admin`);
});
