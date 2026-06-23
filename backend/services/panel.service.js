import * as panelModel from "../model/panel.model.js";
import { ApiError } from "../utils/api.util.js";
import { FETCH_ERROR } from "../utils/message.util.js";

export const getPanelsService = async () => {
  try {
    return await panelModel.getPanelsModel();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Panels", error, false);
  }
};
