import "dotenv/config";
import { app } from "./app.js";
import { verifyNeo4jConnection } from "./db/driver.js";

const PORT = Number(process.env.PORT) || 3001;

async function start(): Promise<void> {
  await verifyNeo4jConnection();
  console.log("Connected to Neo4j");

  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
