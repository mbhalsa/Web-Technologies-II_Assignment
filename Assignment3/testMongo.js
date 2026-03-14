"use strict";

const { MongoClient } = require("mongodb");
const fs = require("fs/promises");

async function main() {
  const cfgText = await fs.readFile("config.json", "utf8");
  const cfg = JSON.parse(cfgText);

  const client = new MongoClient(cfg.mongoUri);
  await client.connect();

  const db = client.db("infs3201_winter2026");
  await db.command({ ping: 1 });

  console.log("MongoDB connected: OK");

  await client.close();
}

main().catch((err) => {
  console.log("MongoDB connected: FAILED");
  console.log(String(err));
});