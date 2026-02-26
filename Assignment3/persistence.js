"use strict";


const fs = require("fs/promises");
const { MongoClient } = require("mongodb");

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
 * @returns {Promise<Array<{ employeeId: string, name: string, phone: string }>>}
 */
async function getAllEmployees() {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    return await db.collection("employees").find({}).toArray();
  } finally {
    await client.close();
  }
}

/**
 * Find one employee by employeeId.
 *
 * @param {string} empId
 * @returns {Promise<{ employeeId: string, name: string, phone: string }|undefined>}
 */
async function findEmployee(empId) {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const employee = await db
      .collection("employees")
      .findOne({ employeeId: empId });

    return employee || undefined;
  } finally {
    await client.close();
  }
}

/**
 * Get shifts for an employee by joining assignments -> shifts.
 *
 * @param {string} empId
 * @returns {Promise<Array<{shiftId:string, date:string, startTime:string, endTime:string}>>}
 */
async function getEmployeeShifts(empId) {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    const assignments = await db
      .collection("assignments")
      .find({ employeeId: empId })
      .toArray();

    const shiftIds = [];
    for (let i = 0; i < assignments.length; i++) {
      shiftIds.push(assignments[i].shiftId);
    }

    if (shiftIds.length === 0) {
      return [];
    }

    return await db
      .collection("shifts")
      .find({ shiftId: { $in: shiftIds } })
      .toArray();
  } finally {
    await client.close();
  }
}
async function updateEmployee(empId, name, phone) {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    await db.collection("employees").updateOne(
      { employeeId: empId },
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
