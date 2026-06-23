import express from "express";
import {
  createLocationController,
  deleteLocationController,
  getLocationByIdController,
  getLocationsController,
  updateLocationController,
} from "../controllers/location.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createLocationSchema,
  locationIdParamSchema,
  updateLocationSchema,
} from "../validations/location.validation.js";

const router = express.Router();

router.use(authGuard);

router.get("/", getLocationsController);
router.get("/:location_id", validate(locationIdParamSchema, "params"), getLocationByIdController);
router.post("/", validate(createLocationSchema, "body"), createLocationController);
router.put(
  "/:location_id",
  validate(locationIdParamSchema, "params"),
  validate(updateLocationSchema, "body"),
  updateLocationController,
);
router.delete("/:location_id", validate(locationIdParamSchema, "params"), deleteLocationController);

export default router;
