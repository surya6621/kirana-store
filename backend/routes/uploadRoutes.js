const express = require("express");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { authenticate, requireStaff } = require("../middleware/authMiddleware");

const router = express.Router();

// Initialize Supabase client if environment variables are present
let supabase = null;
try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (error) {
    console.error("Failed to initialize Supabase client:", error);
}

// Configure multer to use memory storage so we can stream/upload buffer directly to Supabase
const storage = multer.memoryStorage();

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
    upload.single("image")(req, res, async (err) => {
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

        if (!supabase) {
            return res.status(500).json({
                success: false,
                message: "Supabase storage is not configured on the server. Please check SUPABASE_URL and SUPABASE_SECRET_KEY.",
            });
        }

        try {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = path.extname(req.file.originalname).toLowerCase();
            const fileName = `products/product-${uniqueSuffix}${ext}`;
            const bucketName = "product-images";

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (error) {
                console.error("Supabase upload error:", error);
                return res.status(500).json({
                    success: false,
                    message: `Failed to upload image to Supabase: ${error.message}`,
                });
            }

            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            res.status(200).json({
                success: true,
                message: "Image uploaded successfully to Supabase Storage",
                imageUrl: publicUrl,
                data: {
                    imageUrl: publicUrl,
                    path: fileName,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                },
            });
        } catch (uploadErr) {
            console.error("Unexpected upload error:", uploadErr);
            res.status(500).json({
                success: false,
                message: uploadErr.message || "Internal server error during image upload",
            });
        }
    });
});

module.exports = router;
