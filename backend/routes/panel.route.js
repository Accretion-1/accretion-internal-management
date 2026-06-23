import express from "express";
import { getPanelsController } from "../controllers/panel.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";

const router = express.Router();

router.use(authGuard);
router.get("/", getPanelsController);

export default router;
