import express from "express";
import multer from "multer";
import { verifyOcrController } from "../controllers/ocr.controller.js";
import { apiError } from "../utils/api.util.js";
import { CUSTOM_ERROR } from "../utils/message.util.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    return cb(null, true);
  },
});

const handleMulterError = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      return apiError(CUSTOM_ERROR, error.message || "Invalid image upload", null, res);
    }

    return next();
  });
};

router.post("/verify", handleMulterError, verifyOcrController);

export default router;
