import express from "express";
import { uploadGodownSlips } from "../controllers/godown-slip.controller.js";
import { array } from "../middlewares/multer.middleware.js";
import { authGuard } from "../middlewares/guard.middleware.js";

const router = express.Router();

// Route for uploading multiple godown slips
// Uses authGuard to protect the route and ensure req.user is available
// Uses multer middleware to accept up to 10 files in the 'slips' field, stored in 'godown_slips' folder
router.post("/upload", authGuard, array("godown_slips", "slips", 10), uploadGodownSlips);

export default router;
