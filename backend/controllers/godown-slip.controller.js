import { processAndSaveGodownSlips, fetchAdminSlips, fetchUserSlips, fetchSlipById, reviewGodownSlipService } from "../services/godown-slip.service.js";
import { apiError, apiResponse } from "../utils/api.util.js";
import { CUSTOM_ERROR, SUCCESS, UPDATE_SUCCESS } from "../utils/message.util.js";

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

export const getAdminSlips = async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return apiError(CUSTOM_ERROR, "Unauthorized access", null, res);
    }
    const result = await fetchAdminSlips(req.query);
    return apiResponse(SUCCESS, "Slips fetched successfully", result, res, "object");
  } catch (error) {
    console.error("Error fetching admin slips:", error);
    return apiError(CUSTOM_ERROR, "Failed to fetch slips", error.message, res);
  }
};

export const getUserSlips = async (req, res) => {
  try {
    const result = await fetchUserSlips(req.user, req.query);
    return apiResponse(SUCCESS, "Slips fetched successfully", result, res, "object");
  } catch (error) {
    console.error("Error fetching user slips:", error);
    return apiError(CUSTOM_ERROR, "Failed to fetch slips", error.message, res);
  }
};

export const getSlipById = async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return apiError(CUSTOM_ERROR, "Unauthorized access", null, res);
    }
    const { id } = req.params;
    const slip = await fetchSlipById(id);
    if (!slip) {
      return apiError(CUSTOM_ERROR, "Slip not found", null, res);
    }
    return apiResponse(SUCCESS, "Slip fetched successfully", slip, res, "object");
  } catch (error) {
    console.error("Error fetching slip by ID:", error);
    return apiError(CUSTOM_ERROR, "Failed to fetch slip", error.message, res);
  }
};

export const reviewGodownSlip = async (req, res) => {
  try {
    const { id } = req.params;
    const slip = await reviewGodownSlipService(req.user, id, req.body);
    return apiResponse(UPDATE_SUCCESS, "Godown slip", slip, res, "object");
  } catch (error) {
    console.error("Error reviewing godown slip:", error);
    return apiError(
      [error.statusCode || CUSTOM_ERROR[0], error.message || "Failed to review slip"],
      null,
      error.internal || null,
      res,
    );
  }
};
