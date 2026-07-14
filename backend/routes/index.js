import express from "express";
import locationRoutes from "./location.route.js";
import notificationRoutes from "./notification.route.js";
import ocrRoutes from "./ocr.route.js";
import panelRoutes from "./panel.route.js";
import todoRoutes from "./todo.route.js";
import userRoutes from "./user.route.js";
import godownSlipRoutes from "./godown-slip.route.js";

const router = express.Router();

router.use("/locations", locationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/api/v1/ocr", ocrRoutes);
router.use("/v1/ocr", ocrRoutes);
router.use("/panels", panelRoutes);
router.use("/todos", todoRoutes);
router.use("/user", userRoutes);
router.use("/godown-slips", godownSlipRoutes);

export default router;
