"use strict";

const fs = require("fs/promises");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const SETTINGS_FILE = "config.json";
const DB_NAME = "infs3201_winter2026";

async function readSettings() {
    const fileText = await fs.readFile(SETTINGS_FILE, "utf8");
    const obj = JSON.parse(fileText);

    const uri = String(obj.mongoUri || "").trim();
    if (!uri) {
        throw new Error("Missing mongoUri in config.json");
    }

    return { mongoUri: uri };
}

async function main() {
    const settings = await readSettings();
    const client = new MongoClient(settings.mongoUri);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const users = db.collection("users");

        await users.deleteMany({});

        const adminHash = await bcrypt.hash("admin1pass", 10);
        const staffHash = await bcrypt.hash("staff1pass", 10);

        await users.insertOne({
            username: "admin1",
            password: adminHash
        });

        await users.insertOne({
            username: "staff1",
            password: staffHash
        });

        console.log("Users created successfully.");
    } finally {
        await client.close();
    }
}

main().catch(console.error);