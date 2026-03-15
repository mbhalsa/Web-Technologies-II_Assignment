"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { MongoClient } = require("mongodb");
const cookieParser = require("cookie-parser");
const business = require("./business");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();

const SETTINGS_FILE = "config.json";
const DB_NAME = "infs3201_winter2026";
const SESSION_DURATION_MS = 5 * 60 * 1000;

const sessions = {};

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
app.use(cookieParser());
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
 * Write one security log entry.
 *
 * @param {string} username
 * @param {string} url
 * @param {string} method
 * @returns {Promise<void>}
 */
async function writeSecurityLog(username, url, method) {
  const settings = await readSettings();
  const client = new MongoClient(settings.mongoUri);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    await db.collection("security_log").insertOne({
      timestamp: new Date(),
      username: username,
      url: url,
      method: method
    });
  } finally {
    await client.close();
  }
}

/**
 * Create a new session.
 *
 * @param {string} username
 * @returns {string}
 */
function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString("hex");

  sessions[sessionId] = {
    username: username,
    expiresAt: Date.now() + SESSION_DURATION_MS
  };

  return sessionId;
}

/**
 * Return session if valid, otherwise null.
 *
 * @param {string} sessionId
 * @returns {Object|null}
 */
function getSession(sessionId) {
  if (typeof sessionId !== "string") {
    return null;
  }

  const session = sessions[sessionId];

  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    delete sessions[sessionId];
    return null;
  }

  return session;
}

/**
 * Extend session for another 5 minutes.
 *
 * @param {string} sessionId
 * @returns {void}
 */
function extendSession(sessionId) {
  if (sessions[sessionId]) {
    sessions[sessionId].expiresAt = Date.now() + SESSION_DURATION_MS;
  }
}

/**
 * Delete session.
 *
 * @param {string} sessionId
 * @returns {void}
 */
function deleteSession(sessionId) {
  if (sessions[sessionId]) {
    delete sessions[sessionId];
  }
}

/**
 * Middleware to log all accesses.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {void}
 */
function securityLogMiddleware(req, res, next) {
  const sessionId = req.cookies.sessionId;
  const session = getSession(sessionId);

  let username = "unknown";

  if (session && typeof session.username === "string") {
    username = session.username;
  }

  writeSecurityLog(username, req.originalUrl, req.method)
    .then(function () {
      next();
    })
    .catch(function (err) {
      console.error(err);
      next();
    });
}

/**
 * Middleware to protect routes.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 * @returns {void}
 */
function requireLogin(req, res, next) {
  const sessionId = req.cookies.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    return res.redirect("/login?message=Please login");
  }

  extendSession(sessionId);

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS
  });

  next();
}

app.use(securityLogMiddleware);

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

  const sessionId = createSession(username);

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS
  });

  res.redirect("/");
});

/**
 * Logout route.
 */
app.get("/logout", function (req, res) {
  const sessionId = req.cookies.sessionId;

  deleteSession(sessionId);
  res.clearCookie("sessionId");

  res.redirect("/login?message=Logged out");
});

/**
 * Landing page: list of employees.
 */
app.get("/", requireLogin, async function (req, res) {
  const employees = await business.listEmployees();
  res.render("home", { employees: employees });
});

/**
 * Employee details page.
 */
app.get("/employees/:id", requireLogin, async function (req, res) {
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
 * Edit form.
 */
app.get("/employees/:id/edit", requireLogin, async function (req, res) {
  const empId = req.params.id;

  const employee = await business.getEmployee(empId);

  if (!employee) {
    return res.status(404).send("Employee not found");
  }

  res.render("editEmployee", { employee: employee });
});

/**
 * Edit submit.
 */
app.post("/employees/:id/edit", requireLogin, async function (req, res) {
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