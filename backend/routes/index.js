import express from "express";
import locationRoutes from "./location.route.js";
import panelRoutes from "./panel.route.js";
import userRoutes from "./user.route.js";

const router = express.Router();

router.use("/locations", locationRoutes);
router.use("/panels", panelRoutes);
router.use("/user", userRoutes);

export default router;
