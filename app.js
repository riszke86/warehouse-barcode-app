const express = require("express");
const path = require("path");
const db = require("./database");
const productRoutes = require("./routes/products");

const app = express();
const PORT = 3000;const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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

// Start server
app.use("/products", productRoutes);
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});