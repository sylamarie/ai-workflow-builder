import neo4j, { type Driver } from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
  throw new Error("Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD in environment");
}

export const driver: Driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export const NEO4J_DATABASE = "neo4j";

export async function verifyNeo4jConnection(): Promise<void> {
  await driver.verifyConnectivity();
}

export async function closeDriver(): Promise<void> {
  await driver.close();
}
