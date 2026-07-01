import { apiHandler, apiResponse } from "../utils/api.util.js";
import { CUSTOM_SUCCESS } from "../utils/message.util.js";
import * as ocrService from "../services/ocr.service.js";

export const verifyOcrController = apiHandler(async (req, res) => {
  const result = await ocrService.verifyOcrImageService(req.file);
  return apiResponse(CUSTOM_SUCCESS, "OCR verification completed", result, res, "object");
});
