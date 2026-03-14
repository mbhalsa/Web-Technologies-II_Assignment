"use strict";

const persistence = require("./persistence");

/**
 * List all employees.
 */
async function listEmployees() {
  return await persistence.getAllEmployees();
}

/**
 * Get one employee by ID.
 * @param {string} empId
 */
async function getEmployee(empId) {
  return await persistence.findEmployee(empId);
}

/**
 * Get shifts for an employee (unsorted).
 * @param {string} empId
 */
async function getScheduleForEmployee(empId) {
  return await persistence.getEmployeeShifts(empId);
}

/**
 * Get shifts for an employee sorted by (date ASC, startTime ASC).
 * Uses loops only (no map/filter/forEach).
 *
 * @param {string} empId
 */
async function getScheduleForEmployeeSorted(empId) {
  const shifts = await persistence.getEmployeeShifts(empId);

  // Bubble sort by date then startTime
  for (let i = 0; i < shifts.length; i++) {
    for (let j = 0; j < shifts.length - 1; j++) {
      const a = shifts[j];
      const b = shifts[j + 1];

      const aKey = a.date + " " + a.startTime;
      const bKey = b.date + " " + b.startTime;

      if (aKey > bKey) {
        const tmp = shifts[j];
        shifts[j] = shifts[j + 1];
        shifts[j + 1] = tmp;
      }
    }
  }

  return shifts;
}
async function updateEmployee(empId, name, phone) {
  await persistence.updateEmployee(empId, name, phone);
}
module.exports = {
  listEmployees,
  getEmployee,
  getScheduleForEmployee,
  getScheduleForEmployeeSorted,
  updateEmployee
};