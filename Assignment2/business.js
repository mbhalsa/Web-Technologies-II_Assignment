"use strict";

const persistence = require("./persistence");

/**
 * Retrieve every employee stored in the system.
 * This function acts as an intermediary between the presentation
 * layer and the persistence layer.
 *
 * @returns {Promise<Array<{ employeeId: string, name: string, phone: string }>>}
 */
async function listEmployees() {
  return await persistence.getAllEmployees();
}

/**
 * Insert a new employee into storage.
 * The unique identifier is automatically generated
 * by the persistence layer.
 *
 * @param {{name:string, phone:string}} emp - Object containing employee details.
 * @returns {Promise<void>}
 */
async function addEmployee(emp) {
  await persistence.addEmployeeRecord(emp);
}

/**
 * Obtain the list of shifts assigned to a specific employee,
 * including date and working hours.
 *
 * @param {string} empId - Unique employee identifier.
 * @returns {Promise<Array<{shiftId:string, date:string, startTime:string, endTime:string}>>}
 */
async function getScheduleForEmployee(empId) {
  return await persistence.getEmployeeShifts(empId);
}

/**
 * Link an employee to a shift after performing
 * a series of validation checks.
 *
 * Validation steps:
 * 1. Confirm that the employee exists.
 * 2. Confirm that the shift exists.
 * 3. Ensure the employee is not already assigned.
 * 4. Verify that daily working hours do not exceed the configured limit.
 *
 * @param {string} empId - Identifier of the employee.
 * @param {string} shiftId - Identifier of the shift.
 * @returns {Promise<string>} Operation result message.
 */
async function assignShift(empId, shiftId) {

  // Verify employee presence in the system
  const employee = await persistence.findEmployee(empId);
  if (!employee) {
    return "Employee does not exist";
  }

  // Verify shift availability
  const shift = await persistence.findShift(shiftId);
  if (!shift) {
    return "Shift does not exist";
  }

  // Prevent duplicate assignments
  const assignment = await persistence.findAssignment(empId, shiftId);
  if (assignment) {
    return "Employee already assigned to shift";
  }

  // Retrieve configuration to enforce maximum daily workload
  const config = await persistence.getConfig();
  const maxDailyHours = Number(config.maxDailyHours);

  if (!Number.isFinite(maxDailyHours) || maxDailyHours <= 0) {
    return "Invalid config: maxDailyHours must be a positive number";
  }

  // Calculate duration of the new shift
  const newShiftMinutes = getShiftMinutes(shift.startTime, shift.endTime);
  if (!Number.isFinite(newShiftMinutes) || newShiftMinutes <= 0) {
    return "Invalid shift time format";
  }

  const scheduled = await persistence.getEmployeeShifts(empId);

  // Sum the minutes already scheduled for the same calendar day
  let scheduledMinutesForDate = 0;

  for (let i = 0; i < scheduled.length; i++) {
    if (scheduled[i].date === shift.date) {

      const minutes = getShiftMinutes(
        scheduled[i].startTime,
        scheduled[i].endTime
      );

      // Abort if corrupted time data is detected
      if (!Number.isFinite(minutes) || minutes <= 0) {
        return "Invalid shift time format";
      }

      scheduledMinutesForDate += minutes;
    }
  }

  const maxDailyMinutes = Math.floor(maxDailyHours * 60);

  // Reject assignment if it exceeds the daily threshold
  if (scheduledMinutesForDate + newShiftMinutes > maxDailyMinutes) {
    return "Cannot assign shift: maxDailyHours limit would be exceeded.";
  }

  await persistence.addAssignment(empId, shiftId);
  return "Ok";
}

/**
 * Transform a time formatted as "HH:MM" into the total
 * number of minutes elapsed since midnight.
 *
 * Returns NaN if the provided value does not respect
 * the expected format.
 *
 * @param {string} timeText - Time expressed in 24-hour format.
 * @returns {number} Total minutes or NaN if invalid.
 */
function toMinutes(timeText) {

  if (typeof timeText !== "string" || timeText.length !== 5) {
    return NaN;
  }

  if (timeText[2] !== ":") {
    return NaN;
  }

  const hour = Number(timeText.slice(0, 2));
  const minute = Number(timeText.slice(3, 5));

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return NaN;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return NaN;
  }

  return hour * 60 + minute;
}

/**
 * Determine the duration of a shift in minutes.
 * Overnight shifts are supported by extending
 * the end time into the following day.
 *
 * Example:
 * 22:00 → 02:00 will be interpreted as a 4-hour shift.
 *
 * @param {string} startTime - Shift starting time.
 * @param {string} endTime - Shift ending time.
 * @returns {number} Duration in minutes or NaN if invalid.
 */
function getShiftMinutes(startTime, endTime) {

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return NaN;
  }

  let endAdjusted = end;

  // Handle shifts that continue past midnight
  if (endAdjusted < start) {
    endAdjusted += 24 * 60;
  }

  return endAdjusted - start;
}

module.exports = {
  listEmployees,
  addEmployee,
  getScheduleForEmployee,
  assignShift,
  getShiftMinutes
};
