import express from "express";
import { uploadGodownSlips, getAdminSlips, getUserSlips, getSlipById, reviewGodownSlip } from "../controllers/godown-slip.controller.js";
import { array } from "../middlewares/multer.middleware.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { godownSlipIdParamSchema, reviewGodownSlipSchema } from "../validations/godown-slip.validation.js";

const router = express.Router();

// Route for uploading multiple godown slips
// Uses authGuard to protect the route and ensure req.user is available
// Uses multer middleware to accept up to 10 files in the 'slips' field, stored in 'godown_slips' folder
router.post("/upload", authGuard, array("godown_slips", "slips", 10), uploadGodownSlips);

// GET routes
router.get("/all", authGuard, getAdminSlips); // Admin only, gets all with filters
router.patch("/:id/review", authGuard, validate(godownSlipIdParamSchema, "params"), validate(reviewGodownSlipSchema, "body"), reviewGodownSlip);
router.get("/:id", authGuard, getSlipById);   // Admin only, get specific slip
router.get("/", authGuard, getUserSlips);     // User only, gets slips for their location

export default router;
