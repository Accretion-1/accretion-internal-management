import { configureStore } from "@reduxjs/toolkit";
import authReducer, { logout } from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ["meta.arg", "payload.raw"],
      },
    }),
  devTools: import.meta.env.DEV,
});

if (typeof window !== "undefined") {
  window.addEventListener("auth:unauthorized", () => {
    store.dispatch(logout());
  });
}

export default store;
