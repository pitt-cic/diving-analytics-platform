// Mock authentication service for development without a real backend

import { config } from "../config";

// Mock user data
const MOCK_USER = {
  username: "demo@example.com",
  email: "demo@example.com",
  given_name: "Demo",
  family_name: "User",
};

// Local storage keys
const TOKEN_KEY = "diveGenie_auth_token";
const USER_KEY = "diveGenie_user";

/**
 * Check if we should use mock authentication
 */
export const shouldUseMockAuth = (): boolean => {
  return config.features.useMockData === true;
};

/**
 * Sign in with mock credentials
 */
export const mockSignIn = async (
  username: string,
  password: string
): Promise<any> => {
  // For mock auth, we accept any non-empty credentials
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Create a mock token
  const token = `mock-token-${Date.now()}`;
  const user = {
    ...MOCK_USER,
    username: username,
    email: username,
  };

  // Store in local storage
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return {
    user,
    token,
  };
};

/**
 * Sign up with mock credentials
 */
export const mockSignUp = async (params: any): Promise<any> => {
  const { username, password, attributes } = params;

  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  if (!attributes.email || !attributes.given_name || !attributes.family_name) {
    throw new Error("Email, first name, and last name are required");
  }

  // Simply log the sign-up and return success
  console.log("Mock sign up successful", { username, attributes });

  return {
    user: {
      username,
      ...attributes,
    },
    userConfirmed: true,
  };
};

/**
 * Confirm sign up (in mock mode, this is automatic)
 */
export const mockConfirmSignUp = async (
  username: string,
  code: string
): Promise<any> => {
  return { username };
};

/**
 * Get current authenticated user
 */
export const mockCurrentAuthenticatedUser = async (): Promise<any> => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) {
    throw new Error("No authenticated user");
  }

  return JSON.parse(userStr);
};

/**
 * Sign out
 */
export const mockSignOut = async (): Promise<any> => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  return {};
};

/**
 * Check if user is authenticated
 */
export const mockIsAuthenticated = (): boolean => {
  return !!localStorage.getItem(TOKEN_KEY);
};
