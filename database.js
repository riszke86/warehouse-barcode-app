const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const databasePath = path.join(__dirname, "warehouse.db");

const db = new sqlite3.Database(databasePath, (error) => {
    if (error) {
        console.error("Database connection failed:", error.message);
        return;
    }

    console.log("Connected to the warehouse database.");
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            barcode_value TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (error) => {
        if (error) {
            console.error("Products table creation failed:", error.message);
            return;
        }

        console.log("Products table is ready.");
    });
});

module.exports = db;