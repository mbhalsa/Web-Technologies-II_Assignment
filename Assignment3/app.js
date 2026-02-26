"use strict";

const express = require("express");
const path = require("path");
const business = require("./business");

const app = express();

app.engine(
  "hbs",
  require("express-handlebars").engine({
    extname: "hbs",
    defaultLayout: false
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false })); // forms (pas de JS client)
app.use(express.static(path.join(__dirname, "public")));

/**
 * Landing page: list of employees (links).
 */
app.get("/", async function (req, res) {
  const employees = await business.listEmployees();
  res.render("home", { employees: employees });
});

/**
 * Employee details page: employee info + shifts list.
 */
app.get("/employees/:id", async function (req, res) {
  const empId = req.params.id;

  const employee = await business.getEmployee(empId);
  if (!employee) {
    return res.status(404).send("Employee not found");
  }

  const shifts = await business.getScheduleForEmployeeSorted(empId);

  // for highlighting < 12:00
  for (let i = 0; i < shifts.length; i++) {
    shifts[i].isMorning = shifts[i].startTime < "12:00";
  }

  res.render("employee", { employee: employee, shifts: shifts });
});

/**
 * Edit form (prefilled)
 */
app.get("/employees/:id/edit", async function (req, res) {
  const empId = req.params.id;

  const employee = await business.getEmployee(empId);
  if (!employee) {
    return res.status(404).send("Employee not found");
  }

  res.render("editEmployee", { employee: employee });
});

/**
 * Edit submit (server-side validation + PRG redirect)
 */
app.post("/employees/:id/edit", async function (req, res) {
  const empId = req.params.id;

  let name = req.body.name;
  let phone = req.body.phone;

  if (typeof name !== "string") {
    name = "";
  }
  if (typeof phone !== "string") {
    phone = "";
  }

  name = name.trim();
  phone = phone.trim();

  if (name.length === 0) {
    return res.send("Validation failed: Name must be non-empty");
  }

  // 4 digits - dash - 4 digits
  const phoneOk = /^[0-9]{4}-[0-9]{4}$/.test(phone);
  if (!phoneOk) {
    return res.send("Validation failed: Phone must be 4 digits, a dash, then 4 digits");
  }

  // update DB
  await business.updateEmployee(empId, name, phone);

  // PRG cycle: redirect to landing page
  res.redirect("/");
});

app.listen(3090, function () {
  console.log("Server running on http://localhost:3090");
});