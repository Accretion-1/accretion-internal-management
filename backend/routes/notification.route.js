import express from "express";
import { sendNotificationController } from "../controllers/notification.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { sendNotificationSchema } from "../validations/notification.validation.js";

const router = express.Router();

router.use(authGuard);

router.post("/send", validate(sendNotificationSchema, "body"), sendNotificationController);

export default router;
