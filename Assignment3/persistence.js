"use strict";

const fs = require("fs/promises");
const { MongoClient, ObjectId } = require("mongodb");

const SETTINGS_FILE = "config.json";
const DB_NAME = "infs3201_winter2026";

/**
 * Read settings from config.json.
 *
 * @returns {Promise<{ mongoUri: string }>}
 */
async function readSettings() {
    const fileText = await fs.readFile(SETTINGS_FILE, "utf8");
    const obj = JSON.parse(fileText);

    const uri = String(obj.mongoUri || "").trim();
    if (!uri) {
        throw new Error("Missing mongoUri in config.json");
    }

    return { mongoUri: uri };
}

/**
 * Return all employees.
 *
 * @returns {Promise<Array<Object>>}
 */
async function getAllEmployees() {
    const settings = await readSettings();
    const client = new MongoClient(settings.mongoUri);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const employees = [];
        const cursor = db.collection("employees").find({});

        while (await cursor.hasNext()) {
            employees.push(await cursor.next());
        }

        return employees;
    } finally {
        await client.close();
    }
}

/**
 * Find one employee by MongoDB _id.
 *
 * @param {string} empId
 * @returns {Promise<Object|undefined>}
 */
async function findEmployee(empId) {
    const settings = await readSettings();
    const client = new MongoClient(settings.mongoUri);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const employee = await db.collection("employees").findOne({
            _id: new ObjectId(empId)
        });

        return employee || undefined;
    } finally {
        await client.close();
    }
}

/**
 * Get shifts for an employee using embedded employees array.
 *
 * @param {string} empId
 * @returns {Promise<Array<Object>>}
 */
async function getEmployeeShifts(empId) {
    const settings = await readSettings();
    const client = new MongoClient(settings.mongoUri);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const shifts = [];
        const cursor = db.collection("shifts").find({
            employees: new ObjectId(empId)
        });

        while (await cursor.hasNext()) {
            shifts.push(await cursor.next());
        }

        return shifts;
    } finally {
        await client.close();
    }
}

/**
 * Update employee by MongoDB _id.
 *
 * @param {string} empId
 * @param {string} name
 * @param {string} phone
 * @returns {Promise<void>}
 */
async function updateEmployee(empId, name, phone) {
    const settings = await readSettings();
    const client = new MongoClient(settings.mongoUri);

    try {
        await client.connect();
        const db = client.db(DB_NAME);

        await db.collection("employees").updateOne(
            { _id: new ObjectId(empId) },
            { $set: { name: name, phone: phone } }
        );
    } finally {
        await client.close();
    }
}

module.exports = {
    getAllEmployees,
    findEmployee,
    getEmployeeShifts,
    updateEmployee
};