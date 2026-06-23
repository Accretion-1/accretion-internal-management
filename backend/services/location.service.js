import * as locationModel from "../model/location.model.js";
import { ApiError } from "../utils/api.util.js";
import { ADD_ERROR, CUSTOM_ERROR, DELETE_ERROR, FETCH_ERROR, NOT_FOUND, UPDATE_ERROR } from "../utils/message.util.js";
import { isEmpty } from "../utils/misc.util.js";

const normalizeLocationPayload = (payload) => ({
  ...payload,
  district: payload.district === "" ? null : payload.district,
  godown: payload.godown === "" ? null : payload.godown,
  sloc: payload.sloc === "" ? null : payload.sloc,
  remark: payload.remark === "" ? null : payload.remark,
});

const ensureLocationExists = async (locationId) => {
  const location = await locationModel.getLocationByIdModel(locationId);

  if (isEmpty(location)) {
    throw new ApiError(NOT_FOUND, "Location");
  }

  return location;
};

export const getLocationsService = async () => {
  try {
    return await locationModel.getLocationsModel();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Locations", error, false);
  }
};

export const getLocationByIdService = async (locationId) => {
  try {
    return await ensureLocationExists(locationId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Location", error, false);
  }
};

export const createLocationService = async (payload) => {
  try {
    const locationPayload = normalizeLocationPayload(payload);
    const result = await locationModel.createLocationModel(locationPayload);

    if (!result?.insertId) {
      throw new ApiError(CUSTOM_ERROR, "Location was not created");
    }

    return await ensureLocationExists(result.insertId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(ADD_ERROR, "Location", error, false);
  }
};

export const updateLocationService = async (locationId, payload) => {
  try {
    await ensureLocationExists(locationId);
    await locationModel.updateLocationModel(locationId, normalizeLocationPayload(payload));
    return await ensureLocationExists(locationId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(UPDATE_ERROR, "Location", error, false);
  }
};

export const deleteLocationService = async (locationId) => {
  try {
    await ensureLocationExists(locationId);
    await locationModel.softDeleteLocationModel(locationId);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(DELETE_ERROR, "Location", error, false);
  }
};
