const express = require("express");
const multer = require("multer");
const path = require("path");
const { authenticate, requireStaff } = require("../middleware/authMiddleware");

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../uploads"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `product-${uniqueSuffix}${ext}`);
    },
});

// File filter for image formats (JPG, JPEG, PNG, WEBP)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed"), false);
    }
};

// 5MB file size limit
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

// POST /api/upload
router.post("/", authenticate, requireStaff, (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds the 5MB limit",
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file upload",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image file to upload",
            });
        }

        const relativePath = `/uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: relativePath,
            data: {
                imageUrl: relativePath,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
            },
        });
    });
});

module.exports = router;
