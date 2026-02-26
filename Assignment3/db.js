"use strict";

const { MongoClient } = require("mongodb");

const DB_NAME = "infs3201_winter2026";

let client = null;
let db = null;

/**
 * Connect to MongoDB and return the database handle.
 *
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<import("mongodb").Db>}
 */
async function getDb(uri) {
  if (db) {
    return db;
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(DB_NAME);
  return db;
}

/**
 * Close MongoDB connection (optional).
 *
 * @returns {Promise<void>}
 */
async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  getDb,
  closeDb
};