"use strict";

const prompt = require("prompt-sync")();
const business = require("./business");

/**
 * Print all employees in a fixed-width table format.
 *
 * @returns {Promise<void>}
 */
async function showEmployeeTable() {
  const employees = await business.listEmployees();

  console.log("Employee ID  Name                Phone");
  console.log("-----------  ------------------- ---------");

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    console.log(emp.employeeId.padEnd(13) + emp.name.padEnd(20) + emp.phone);
  }
}

/**
 * Ask the user for employee details, then save the new employee record.
 *
 * @returns {Promise<void>}
 */
async function createEmployeeUI() {
  const name = prompt("Enter employee name: ");
  const phone = prompt("Enter phone number: ");

  await business.addEmployee({ name: name, phone: phone });
  console.log("Employee added...");
}

/**
 * Display the schedule of a given employee using a CSV-style output.
 *
 * @returns {Promise<void>}
 */
async function printEmployeeSchedule() {
  const empId = prompt("Enter employee ID: ");
  const details = await business.getScheduleForEmployee(empId);

  console.log("");
  console.log("date,start,end");

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    console.log(d.date + "," + d.startTime + "," + d.endTime);
  }
}

/**
 * Main interactive loop for the console menu.
 *
 * @returns {Promise<void>}
 */
async function runMenu() {
  while (true) {
    console.log("1. Show all employees");
    console.log("2. Add new employee");
    console.log("3. View employee schedule");
    console.log("4. Exit");

    const choice = Number(prompt("What is your choice> "));

    if (choice === 1) {
      await showEmployeeTable();
      console.log("\n\n");
    } else if (choice === 2) {
      await createEmployeeUI();
      console.log("\n\n");
    } else if (choice === 3) {
      await printEmployeeSchedule();
      console.log("\n\n");
    } else if (choice === 4) {
      break;
    } else {
      console.log("Error ");
    }
  }

  console.log("Goodbye");
}

runMenu();