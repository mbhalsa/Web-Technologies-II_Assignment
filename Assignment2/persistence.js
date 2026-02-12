"use strict";

const fs = require("fs/promises");

const EMPLOYEES_FILE = "employees.json";
const SHIFTS_FILE = "shifts.json";
const ASSIGNMENTS_FILE = "assignments.json";
const SETTINGS_FILE = "config.json";

/**
 * Load and return all employee records from the employees file.
 *
 * @returns {Promise<Array<{ employeeId: string, name: string, phone: string }>>}
 */
async function getAllEmployees() {
  const fileText = await fs.readFile(EMPLOYEES_FILE, "utf8");
  return JSON.parse(fileText);
}

/**
 * Search for one employee by employeeId.
 *
 * @param {string} empId - Employee identifier (example: "E001").
 * @returns {Promise<{ employeeId: string, name: string, phone: string }|undefined>}
 */
async function findEmployee(empId) {
  const fileText = await fs.readFile(EMPLOYEES_FILE, "utf8");
  const employees = JSON.parse(fileText);

  for (let i = 0; i < employees.length; i++) {
    if (employees[i].employeeId === empId) {
      return employees[i];
    }
  }
  return undefined;
}

/**
 * Search for one shift by shiftId.
 *
 * @param {string} shiftId - Shift identifier (example: "S001").
 * @returns {Promise<{shiftId:string, date:string, startTime:string, endTime:string}|undefined>}
 */
async function findShift(shiftId) {
  const fileText = await fs.readFile(SHIFTS_FILE, "utf8");
  const shifts = JSON.parse(fileText);

  for (let i = 0; i < shifts.length; i++) {
    if (shifts[i].shiftId === shiftId) {
      return shifts[i];
    }
  }
  return undefined;
}

/**
 * Locate an assignment record using the composite key (employeeId + shiftId).
 *
 * @param {string} empId - Employee ID.
 * @param {string} shiftId - Shift ID.
 * @returns {Promise<{employeeId:string, shiftId:string}|undefined>}
 */
async function findAssignment(empId, shiftId) {
  const fileText = await fs.readFile(ASSIGNMENTS_FILE, "utf8");
  const assignments = JSON.parse(fileText);

  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i].employeeId === empId && assignments[i].shiftId === shiftId) {
      return assignments[i];
    }
  }
  return undefined;
}

/**
 * Append a new assignment record to the assignments file.
 * This function does not apply validation rules; business layer is responsible for checks.
 *
 * @param {string} empId - Employee ID.
 * @param {string} shiftId - Shift ID.
 * @returns {Promise<void>}
 */
async function addAssignment(empId, shiftId) {
  const fileText = await fs.readFile(ASSIGNMENTS_FILE, "utf8");
  const assignments = JSON.parse(fileText);

  assignments.push({ employeeId: empId, shiftId: shiftId });

  await fs.writeFile(
    ASSIGNMENTS_FILE,
    JSON.stringify(assignments, null, 4),
    "utf8"
  );
}

/**
 * Add a new employee object and generate the next available employeeId.
 *
 * @param {{name:string, phone:string}} emp - Employee data (without employeeId).
 * @returns {Promise<void>}
 */
async function addEmployeeRecord(emp) {
  const fileText = await fs.readFile(EMPLOYEES_FILE, "utf8");
  const employees = JSON.parse(fileText);

  let maxId = 0;

  for (let i = 0; i < employees.length; i++) {
    const numericId = Number(employees[i].employeeId.slice(1));
    if (numericId > maxId) {
      maxId = numericId;
    }
  }

  emp.employeeId = "E" + String(maxId + 1).padStart(3, "0");
  employees.push(emp);

  await fs.writeFile(
    EMPLOYEES_FILE,
    JSON.stringify(employees, null, 4),
    "utf8"
  );
}

/**
 * Return shift objects for a given employee by joining:
 * assignments (employeeId -> shiftId) with shifts (shiftId -> details).
 *
 * @param {string} empId - Employee ID.
 * @returns {Promise<Array<{shiftId:string, date:string, startTime:string, endTime:string}>>}
 */
async function getEmployeeShifts(empId) {
  let fileText = await fs.readFile(ASSIGNMENTS_FILE, "utf8");
  const assignments = JSON.parse(fileText);

  const shiftIds = [];
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i].employeeId === empId) {
      shiftIds.push(assignments[i].shiftId);
    }
  }

  fileText = await fs.readFile(SHIFTS_FILE, "utf8");
  const shifts = JSON.parse(fileText);

  const results = [];
  for (let i = 0; i < shifts.length; i++) {
    if (shiftIds.includes(shifts[i].shiftId)) {
      results.push(shifts[i]);
    }
  }

  return results;
}

/**
 * Read scheduling settings from config.json and normalize the values.
 * If maxDailyHours is missing or invalid, a safe default is applied.
 *
 * @returns {Promise<{ maxDailyHours: number }>}
 */
async function readSettings() {
  const fileText = await fs.readFile(SETTINGS_FILE, "utf8");
  const obj = JSON.parse(fileText);

  const value = Number(obj.maxDailyHours);

  if (!Number.isFinite(value) || value <= 0) {
    return { maxDailyHours: 8 };
  }

  return { maxDailyHours: value };
}

/**
 * Compatibility wrapper: keep the old function name if other layers still call it.
 * Internally, it delegates to readSettings().
 *
 * @returns {Promise<{ maxDailyHours: number }>}
 */
async function getConfig() {
  return await readSettings();
}

module.exports = {
  getAllEmployees,
  findEmployee,
  findShift,
  findAssignment,
  addAssignment,
  addEmployeeRecord,
  getEmployeeShifts,

  // new + compatibility
  readSettings,
  getConfig
};
