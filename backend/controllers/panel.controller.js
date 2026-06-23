import { apiHandler, apiResponse } from "../utils/api.util.js";
import { FETCH } from "../utils/message.util.js";
import * as panelService from "../services/panel.service.js";

export const getPanelsController = apiHandler(async (req, res) => {
  const panels = await panelService.getPanelsService();
  return apiResponse(FETCH, "Panels", panels, res);
});
