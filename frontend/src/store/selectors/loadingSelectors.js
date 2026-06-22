import { createSelector } from "@reduxjs/toolkit";

export const selectGlobalLoading = createSelector(
  [(state) => state.auth.loading, (state) => state.auth.resendLoading],
  (loading, resendLoading) => loading || resendLoading,
);

export const selectActivityLoading = createSelector([(state) => state], (state) =>
  Object.entries(state).some(
    ([sliceName, sliceState]) =>
      sliceName !== "auth" && Boolean(sliceState?.activityLoading),
  ),
);
