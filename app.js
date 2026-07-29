const express = require("express");
const path = require("path");

const db = require("./database");
const productRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
    res.render("index", {
        pageTitle: "Warehouse Barcode System"
    });
});

// Inventory page
app.get("/inventory", (req, res) => {
    const sql = `
        SELECT
            id,
            product_name,
            sku,
            category,
            location,
            quantity,
            barcode_value,
            created_at
        FROM products
        ORDER BY created_at DESC
    `;

    db.all(sql, [], (error, products) => {
        if (error) {
            console.error("Failed to load inventory:", error.message);

            return res.status(500).render("inventory", {
                pageTitle: "Inventory",
                products: [],
                errorMessage: "The inventory could not be loaded."
            });
        }

        res.render("inventory", {
            pageTitle: "Inventory",
            products,
            errorMessage: null
        });
    });
});

// Product routes
app.use("/products", productRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});