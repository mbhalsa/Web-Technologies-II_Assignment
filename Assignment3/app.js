"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { MongoClient } = require("mongodb");
const business = require("./business");
const bcrypt = require("bcrypt");

const app = express();

const SETTINGS_FILE = "config.json";
const DB_NAME = "infs3201_winter2026";

app.engine(
  "hbs",
  require("express-handlebars").engine({
    extname: "hbs",
    defaultLayout: false
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

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
 * Find user by username.
 *
 * @param {string} username
 * @returns {Promise<Object|null>}
 */
async function findUserByUsername(username) {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    return await db.collection("users").findOne({ username: username });
  } finally {
    await client.close();
  }
}

/**
 * Login page.
 */
app.get("/login", function (req, res) {
  let message = "";

  if (typeof req.query.message === "string") {
    message = req.query.message;
  }

  res.render("login", { message: message });
});

/**
 * Login submit.
 */
app.post("/login", async function (req, res) {
  let username = req.body.username;
  let password = req.body.password;

  if (typeof username !== "string") {
    username = "";
  }
  if (typeof password !== "string") {
    password = "";
  }

  username = username.trim();
  password = password.trim();

  if (username.length === 0 || password.length === 0) {
    return res.redirect("/login?message=Invalid login");
  }

  const user = await findUserByUsername(username);

  if (!user) {
    return res.redirect("/login?message=Invalid login");
  }

  const ok = await bcrypt.compare(password, user.password);

  if (!ok) {
    return res.redirect("/login?message=Invalid login");
  }

  res.redirect("/");
});

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

  const phoneOk = /^[0-9]{4}-[0-9]{4}$/.test(phone);
  if (!phoneOk) {
    return res.send("Validation failed: Phone must be 4 digits, a dash, then 4 digits");
  }

  await business.updateEmployee(empId, name, phone);

  res.redirect("/");
});

app.listen(3090, function () {
  console.log("Server running on http://localhost:3090");
});