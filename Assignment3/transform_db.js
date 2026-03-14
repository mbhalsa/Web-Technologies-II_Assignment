const { MongoClient, ObjectId } = require("mongodb");
const fs = require("fs/promises");

async function readSettings() {
    const data = await fs.readFile("config.json");
    return JSON.parse(data);
}

async function main() {

    const settings = await readSettings();

    const client = new MongoClient(settings.mongoUri);
    await client.connect();

    const db = client.db(settings.database);

    const shifts = db.collection("shifts");

    console.log("Adding employees array to all shifts...");

    await shifts.updateMany(
        {},
        { $set: { employees: [] } }
    );

    console.log("Step 1 complete.");

    await client.close();
}

main().catch(console.error);