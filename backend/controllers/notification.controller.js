import * as notificationService from "../services/notification.service.js";
import * as userModel from "../model/user.model.js";
import { ApiError, apiHandler, apiResponse } from "../utils/api.util.js";
import { CUSTOM_ERROR, CUSTOM_SUCCESS, NOT_FOUND } from "../utils/message.util.js";
import { isEmpty } from "../utils/misc.util.js";

export const sendNotificationController = apiHandler(async (req, res) => {
  const { userId, title, body, data } = req.body;
  const user = await userModel.getUserByIdModel(userId);

  if (isEmpty(user)) {
    throw new ApiError(NOT_FOUND, "User");
  }

  if (!user.fcm_token) {
    throw new ApiError(CUSTOM_ERROR, "User does not have an FCM token");
  }

  try {
    const messageId = await notificationService.sendNotification(
      user.fcm_token,
      title,
      body,
      { data },
    );

    return apiResponse(
      CUSTOM_SUCCESS,
      "Notification sent successfully",
      { message_id: messageId },
      res,
      "object",
    );
  } catch (error) {
    if (notificationService.isUnregisteredTokenError(error)) {
      await userModel.clearUserFcmTokenModel(user.user_id);
      throw new ApiError(CUSTOM_ERROR, "FCM token is invalid and was removed");
    }

    throw new ApiError(CUSTOM_ERROR, "Unable to send notification", error, false);
  }
});
