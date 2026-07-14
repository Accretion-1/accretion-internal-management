import { processAndSaveGodownSlips } from "../services/godown-slip.service.js";
import { apiError, apiResponse } from "../utils/api.util.js";
import { CUSTOM_ERROR, SUCCESS } from "../utils/message.util.js";

/**
 * Upload multiple godown slips and save them to the database
 */
export const uploadGodownSlips = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return apiError(CUSTOM_ERROR, "No files uploaded", null, res);
    }

    // Pass the authenticated user and the uploaded files to the service
    const insertedSlips = await processAndSaveGodownSlips(req.user, files);
    
    return apiResponse(SUCCESS, "Godown slips uploaded successfully", { slips: insertedSlips }, res);
  } catch (error) {
    console.error("Error uploading godown slips:", error);
    return apiError(CUSTOM_ERROR, "Failed to upload godown slips", error.message, res);
  }
};
