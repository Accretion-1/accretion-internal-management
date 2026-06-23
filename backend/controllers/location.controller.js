import { apiHandler, apiResponse } from "../utils/api.util.js";
import { ADD_SUCCESS, DELETE_SUCCESS, FETCH, UPDATE_SUCCESS } from "../utils/message.util.js";
import * as locationService from "../services/location.service.js";

export const getLocationsController = apiHandler(async (req, res) => {
  const locations = await locationService.getLocationsService();
  return apiResponse(FETCH, "Locations", locations, res);
});

export const getLocationByIdController = apiHandler(async (req, res) => {
  const location = await locationService.getLocationByIdService(req.params.location_id);
  return apiResponse(FETCH, "Location", location, res, "object");
});

export const createLocationController = apiHandler(async (req, res) => {
  const location = await locationService.createLocationService(req.body);
  return apiResponse(ADD_SUCCESS, "Location", location, res, "object");
});

export const updateLocationController = apiHandler(async (req, res) => {
  const location = await locationService.updateLocationService(req.params.location_id, req.body);
  return apiResponse(UPDATE_SUCCESS, "Location", location, res, "object");
});

export const deleteLocationController = apiHandler(async (req, res) => {
  await locationService.deleteLocationService(req.params.location_id);
  return apiResponse(DELETE_SUCCESS, "Location", null, res);
});
