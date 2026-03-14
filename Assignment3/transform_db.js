const { MongoClient } = require("mongodb");
const fs = require("fs/promises");

async function readSettings() {
    const data = await fs.readFile("config.json");
    return JSON.parse(data);
}

async function addEmptyEmployeesArray(shifts) {

    console.log("Adding employees array to all shifts...");

    await shifts.updateMany(
        {},
        { $set: { employees: [] } }
    );

    console.log("Step 1 complete.");
}

async function embedEmployeesIntoShifts(db) {

    const employees = db.collection("employees");
    const shifts = db.collection("shifts");
    const assignments = db.collection("assignments");

    console.log("Embedding employee ObjectIds into shift documents...");

    const cursor = assignments.find({});

    while (await cursor.hasNext()) {

        const assignment = await cursor.next();

        const employee = await employees.findOne({
            employeeId: assignment.employeeId
        });

        const shift = await shifts.findOne({
            shiftId: assignment.shiftId
        });

        if (employee !== null && shift !== null) {

            await shifts.updateOne(
                { _id: shift._id },
                { $addToSet: { employees: employee._id } }
            );

        } else {

            console.log(
                "Skipped assignment:",
                assignment.employeeId,
                assignment.shiftId
            );

        }
    }

    console.log("Step 2 complete.");
}

async function removeUnnecessaryItems(db) {

    const employees = db.collection("employees");
    const shifts = db.collection("shifts");
    const assignments = db.collection("assignments");

    console.log("Removing unnecessary fields and collection...");

    await employees.updateMany(
        {},
        { $unset: { employeeId: "" } }
    );

    await shifts.updateMany(
        {},
        { $unset: { shiftId: "" } }
    );

    await assignments.drop();

    console.log("Step 3 complete.");
}

async function main() {

    const settings = await readSettings();

    const client = new MongoClient(settings.mongoUri);
    await client.connect();

    const db = client.db(settings.database);
    const shifts = db.collection("shifts");

    await addEmptyEmployeesArray(shifts);
    await embedEmployeesIntoShifts(db);
    await removeUnnecessaryItems(db);

    await client.close();
}

main().catch(console.error);