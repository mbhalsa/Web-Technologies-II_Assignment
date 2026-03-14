"use strict";

const { MongoClient } = require("mongodb");
const fs = require("fs/promises");

const DB_NAME = "infs3201_winter2026";

async function upsertManyByKey(col, docs, keyField) {
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const key = doc[keyField];

    if (!key) {
      // Ignore invalid rows safely
      continue;
    }

    await col.updateOne(
      { [keyField]: key },
      { $set: doc },
      { upsert: true }
    );
  }
}

async function seed() {
  const configText = await fs.readFile("config.json", "utf8");
  const config = JSON.parse(configText);

  const client = new MongoClient(config.mongoUri);
  await client.connect();

  const db = client.db(DB_NAME);

  const employees = JSON.parse(await fs.readFile("employees.json", "utf8"));
  const shifts = JSON.parse(await fs.readFile("shifts.json", "utf8"));
  const assignments = JSON.parse(await fs.readFile("assignments.json", "utf8"));

  await upsertManyByKey(db.collection("employees"), employees, "employeeId");
  await upsertManyByKey(db.collection("shifts"), shifts, "shiftId");

  // assignments: composite key => employeeId + shiftId
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    if (!a.employeeId || !a.shiftId) {
      continue;
    }

    await db.collection("assignments").updateOne(
      { employeeId: a.employeeId, shiftId: a.shiftId },
      { $set: a },
      { upsert: true }
    );
  }

  console.log("Data imported (upsert) successfully");
  await client.close();
}

seed().catch((err) => {
  console.log(String(err));
});