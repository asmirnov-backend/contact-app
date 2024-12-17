"use strict";
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(":memory:");

const PAGE_SIZE = 100;

export class Contact {
  constructor(
    id = null,
    first = null,
    last = null,
    phone = null,
    email = null
  ) {
    this.id = id;
    this.first = first;
    this.last = last;
    this.phone = phone;
    this.email = email;
    this.errors = {};
  }

  update(first, last, phone, email) {
    this.first = first;
    this.last = last;
    this.phone = phone;
    this.email = email;
  }

  validate() {
    this.errors = {};
    if (!this.email) {
      this.errors.email = "Email Required";
    }
    return Object.keys(this.errors).length === 0;
  }

  async save() {
    if (!this.validate()) {
      return false;
    }
    if (this.id === null) {
      let result = await this.constructor.insert(this);
      this.id = result.id;
    } else {
      await this.constructor.update(this);
    }
    return true;
  }

  async delete() {
    await this.constructor.deleteById(this.id);
  }

  static async insert(contact) {
    return new Promise((resolve, reject) => {
      db.exec(
        `INSERT INTO contacts (first, last, phone, email) VALUES (?, ?, ?, ?)`,
        [contact.first, contact.last, contact.phone, contact.email],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  }

  static async update(contact) {
    return new Promise((resolve, reject) => {
      db.exec(
        `UPDATE contacts SET first = ?, last = ?, phone = ?, email = ? WHERE id = ?`,
        [contact.first, contact.last, contact.phone, contact.email, contact.id],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  static async deleteById(id) {
    return new Promise((resolve, reject) => {
      db.exec(`DELETE FROM contacts WHERE id = ?`, [id], function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  static async all(page = 1) {
    return new Promise((resolve, reject) => {
      let start = (page - 1) * PAGE_SIZE;
      const prepare = db.prepare("SELECT * FROM contacts;");
      prepare.run();
      const rows = prepare.all();
      rows.map(
        (row) => new Contact(row.id, row.first, row.last, row.phone, row.email)
      );
      resolve(rows);
    });
  }

  static async search(text) {
    return new Promise((resolve, reject) => {
      db.exec(
        `SELECT * FROM contacts WHERE first LIKE ? OR last LIKE ? OR email LIKE ? OR phone LIKE ?`,
        [`%${text}%`, `%${text}%`, `%${text}%`, `%${text}%`],
        (err, rows) => {
          if (err) return reject(err);
          resolve(
            rows.map(
              (row) =>
                new Contact(row.id, row.first, row.last, row.phone, row.email)
            )
          );
        }
      );
    });
  }

  static async count() {
    return new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM contacts`, (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      });
    });
  }

  static async find(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM contacts WHERE id = ?`, [id], (err, row) => {
        if (err) return reject(err);
        if (row) {
          let contact = new Contact(
            row.id,
            row.first,
            row.last,
            row.phone,
            row.email
          );
          contact.errors = {};
          resolve(contact);
        } else {
          resolve(null);
        }
      });
    });
  }
}

export class Archiver {
  constructor() {
    this.archive_status = "Waiting";
    this.archive_progress = 0;
    this.thread = null;
  }

  status() {
    return this.archive_status;
  }

  progress() {
    return this.archive_progress;
  }

  run() {
    if (this.archive_status === "Waiting") {
      this.archive_status = "Running";
      this.archive_progress = 0;
      this.thread = setTimeout(() => this.run_impl(), 0);
    }
  }

  run_impl() {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        if (this.archive_status !== "Running") return;
        this.archive_progress = (i + 1) / 10;
        console.log("Here... " + this.archive_progress);
      }, 1000 * Math.random());
    }
    setTimeout(() => {
      if (this.archive_status !== "Running") return;
      this.archive_status = "Complete";
    }, 1000);
  }

  archive_file() {
    return "contacts.json";
  }

  reset() {
    this.archive_status = "Waiting";
  }

  static get() {
    return new Archiver();
  }
}

export function migrate() {
  db.exec(`CREATE TABLE contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first TEXT,
        last TEXT,
        phone TEXT,
        email TEXT
    )`);
}
