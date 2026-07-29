const express = require("express");
const path = require("path");
const fs = require("fs");
const bwipjs = require("bwip-js");

const db = require("../database");

const router = express.Router();


// ========================================
// SHOW CREATE PRODUCT PAGE
// ========================================

router.get("/create", (req, res) => {
    res.render("create", {
        pageTitle: "Create Product",
        errorMessage: null,
        formData: {}
    });
});


// ========================================
// CREATE PRODUCT AND BARCODE
// ========================================

router.post("/create", async (req, res) => {
    const {
        productName,
        sku,
        category,
        location,
        quantity
    } = req.body;

    const cleanedProductName = productName?.trim();
    const cleanedSku = sku?.trim().toUpperCase();
    const cleanedCategory = category?.trim();
    const cleanedLocation = location?.trim().toUpperCase();
    const parsedQuantity = Number.parseInt(quantity, 10);

    if (
        !cleanedProductName ||
        !cleanedSku ||
        !cleanedCategory ||
        !cleanedLocation ||
        Number.isNaN(parsedQuantity) ||
        parsedQuantity < 0
    ) {
        return res.status(400).render("create", {
            pageTitle: "Create Product",
            errorMessage: "Please complete every field correctly.",
            formData: req.body
        });
    }

    /*
        The barcode value is based on the SKU.

        Example:
        SKU: KEY-001
        Barcode value: KEY-001
    */

    const barcodeValue = cleanedSku;

    const barcodeDirectory = path.join(
        __dirname,
        "..",
        "public",
        "barcodes"
    );

    const safeFilename = cleanedSku.replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
    );

    const barcodeFilename = `${safeFilename}.png`;

    const barcodeFilePath = path.join(
        barcodeDirectory,
        barcodeFilename
    );

    try {
        await fs.promises.mkdir(barcodeDirectory, {
            recursive: true
        });

        const barcodeBuffer = await bwipjs.toBuffer({
            bcid: "code128",
            text: barcodeValue,
            scale: 3,
            height: 12,
            includetext: true,
            textxalign: "center",
            paddingwidth: 10,
            paddingheight: 10,
            backgroundcolor: "FFFFFF"
        });

        await fs.promises.writeFile(
            barcodeFilePath,
            barcodeBuffer
        );

        const sql = `
            INSERT INTO products (
                product_name,
                sku,
                category,
                location,
                quantity,
                barcode_value
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(
            sql,
            [
                cleanedProductName,
                cleanedSku,
                cleanedCategory,
                cleanedLocation,
                parsedQuantity,
                barcodeValue
            ],
            async function (error) {
                if (error) {
                    await fs.promises
                        .unlink(barcodeFilePath)
                        .catch(() => {});

                    const duplicateError =
                        error.message.includes("UNIQUE");

                    return res.status(400).render("create", {
                        pageTitle: "Create Product",
                        errorMessage: duplicateError
                            ? "That SKU already exists. Please use a unique SKU."
                            : "The product could not be created.",
                        formData: req.body
                    });
                }

                res.redirect(`/products/${this.lastID}`);
            }
        );
    } catch (error) {
        console.error("Barcode creation failed:", error);

        return res.status(500).render("create", {
            pageTitle: "Create Product",
            errorMessage:
                "The barcode could not be generated. Please try again.",
            formData: req.body
        });
    }
});

// ========================================
// QUICK BARCODE GENERATOR PAGE
// ========================================

router.get("/barcode-generator", (req, res) => {
    res.render("barcode-generator", {
        pageTitle: "Quick Barcode Generator",
        barcodeNumber: "",
        barcodeImage: null,
        errorMessage: null
    });
});


// ========================================
// GENERATE QUICK BARCODE
// ========================================

router.post("/barcode-generator", async (req, res) => {
    const barcodeNumber = req.body.barcodeNumber?.trim();

    if (!barcodeNumber) {
        return res.status(400).render("barcode-generator", {
            pageTitle: "Quick Barcode Generator",
            barcodeNumber: "",
            barcodeImage: null,
            errorMessage: "Please enter a number."
        });
    }

    if (!/^\d+$/.test(barcodeNumber)) {
        return res.status(400).render("barcode-generator", {
            pageTitle: "Quick Barcode Generator",
            barcodeNumber,
            barcodeImage: null,
            errorMessage: "The barcode value must contain numbers only."
        });
    }

    try {
        const barcodeBuffer = await bwipjs.toBuffer({
            bcid: "code128",
            text: barcodeNumber,
            scale: 3,
            height: 14,
            includetext: true,
            textxalign: "center",
            paddingwidth: 12,
            paddingheight: 12,
            backgroundcolor: "FFFFFF"
        });

        const barcodeImage = `data:image/png;base64,${barcodeBuffer.toString(
            "base64"
        )}`;

        return res.render("barcode-generator", {
            pageTitle: "Quick Barcode Generator",
            barcodeNumber,
            barcodeImage,
            errorMessage: null
        });
    } catch (error) {
        console.error("Quick barcode generation failed:", error);

        return res.status(500).render("barcode-generator", {
            pageTitle: "Quick Barcode Generator",
            barcodeNumber,
            barcodeImage: null,
            errorMessage: "The barcode could not be generated."
        });
    }
});


// ========================================
// SHOW SINGLE PRODUCT
// ========================================

router.get("/:id", (req, res) => {
    const productId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(productId)) {
        return res.status(400).send("Invalid product ID.");
    }

    const sql = `
        SELECT *
        FROM products
        WHERE id = ?
    `;

    db.get(sql, [productId], (error, product) => {
        if (error) {
            console.error("Product lookup failed:", error.message);
            return res.status(500).send("Unable to load product.");
        }

        if (!product) {
            return res.status(404).send("Product not found.");
        }

        const safeFilename = product.sku.replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
        );

        res.render("product", {
            pageTitle: product.product_name,
            product,
            barcodeImage: `/barcodes/${safeFilename}.png`
        });
    });
});

module.exports = router;