import { createSelector } from "@reduxjs/toolkit";

export const selectAuth = (state) => state.auth;

export const selectAuthUser = createSelector([selectAuth], (auth) => auth.user);
export const selectAuthLoading = createSelector([selectAuth], (auth) => auth.loading);
export const selectResendLoading = createSelector([selectAuth], (auth) => auth.resendLoading);
export const selectAuthError = createSelector([selectAuth], (auth) => auth.error);
export const selectIsAuthenticated = createSelector(
  [selectAuth],
  (auth) => auth.isAuthenticated,
);
export const selectOtpSent = createSelector([selectAuth], (auth) => auth.otpSent);
export const selectOtpVerified = createSelector([selectAuth], (auth) => auth.otpVerified);
export const selectPasswordReset = createSelector([selectAuth], (auth) => auth.passwordReset);
