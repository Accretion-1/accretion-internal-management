import { createSlice } from "@reduxjs/toolkit";
import { API_ENDPOINTS } from "../api/endpoints";
import { createApiThunk } from "../api/createApiThunk";
import { clearStoredAuth } from "../api/apiClient";

const readStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem("authUserProfile")) || null;
  } catch {
    localStorage.removeItem("authUserProfile");
    return null;
  }
};

const storedToken = localStorage.getItem("authToken");
const storedUser = readStoredProfile();
const hasPersistedSession =
  localStorage.getItem("isAuthenticated") === "true" && Boolean(storedToken && storedUser);

const initialState = {
  user: hasPersistedSession ? storedUser : null,
  token: hasPersistedSession ? storedToken : null,
  isAuthenticated: hasPersistedSession,
  loading: false,
  resendLoading: false,
  error: null,
  otpSent: false,
  otpVerified: false,
  passwordReset: false,
};

const persistAuth = (user, token) => {
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUserProfile", JSON.stringify(user));
  localStorage.setItem("isAuthenticated", "true");
};

export const loginUser = createApiThunk("auth/login", {
  method: "POST",
  url: API_ENDPOINTS.AUTH.LOGIN,
});

export const verifyOtp = createApiThunk("auth/verifyOtp", {
  method: "POST",
  url: API_ENDPOINTS.AUTH.VERIFY_OTP,
});

export const resendOtp = createApiThunk("auth/resendOtp", {
  method: "POST",
  url: API_ENDPOINTS.AUTH.RESEND_OTP,
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    resetOtpState(state) {
      state.otpSent = false;
      state.otpVerified = false;
      state.error = null;
    },
    syncAuthenticatedUser(state, action) {
      const user = action.payload || null;
      state.user = user;
      state.isAuthenticated = Boolean(user && state.token);
      if (state.isAuthenticated) {
        persistAuth(user, state.token);
      } else {
        clearStoredAuth();
      }
    },
    logout(state) {
      Object.assign(state, initialState, {
        user: null,
        token: null,
        isAuthenticated: false,
      });
      clearStoredAuth();
      sessionStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.otpSent = false;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
        state.otpSent = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        const user = action.payload?.data?.user || null;
        const token = action.payload?.data?.token || null;

        state.loading = false;
        state.user = user;
        state.token = token;
        state.isAuthenticated = Boolean(user && token);
        state.otpVerified = state.isAuthenticated;

        if (state.isAuthenticated) persistAuth(user, token);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resendOtp.pending, (state) => {
        state.resendLoading = true;
        state.error = null;
      })
      .addCase(resendOtp.fulfilled, (state) => {
        state.resendLoading = false;
        state.otpSent = true;
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.resendLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAuthError, logout, resetOtpState, syncAuthenticatedUser } = authSlice.actions;
export default authSlice.reducer;
