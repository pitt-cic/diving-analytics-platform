import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetRequested, setResetRequested] = useState(false);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [cognitoUser, setCognitoUser] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await Auth.signIn(username, password);
      
      // Check if the user needs to set a new password
      if (user.challengeName === "NEW_PASSWORD_REQUIRED") {
        // Save the user object to state to be used in completeNewPassword
        setCognitoUser(user);
        setIsNewPasswordRequired(true);
        
        // Parse the user attributes if available
        if (user.challengeParams && user.challengeParams.userAttributes) {
          try {
            const attributes = JSON.parse(user.challengeParams.userAttributes);
            if (attributes.given_name) setFirstName(attributes.given_name);
            if (attributes.family_name) setLastName(attributes.family_name);
          } catch (e) {
            console.error("Error parsing user attributes:", e);
          }
        }
      } else {
        // Normal sign-in, redirect to home
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError("Please enter your username to reset password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Auth.forgotPassword(username);
      setResetRequested(true);
      setIsForgotPassword(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword) {
      setError("Please enter both the verification code and new password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Auth.forgotPasswordSubmit(username, resetCode, newPassword);
      // Reset states
      setIsForgotPassword(false);
      setResetRequested(false);
      setResetCode("");
      setNewPassword("");
      alert("Password has been reset successfully. Please log in with your new password.");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };
  
  const handleCompleteNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Create an object with the required user attributes
      const userAttributes = {
        given_name: firstName,
        family_name: lastName,
      };
      
      // Complete the new password challenge
      await Auth.completeNewPassword(
        cognitoUser,
        newPassword,
        userAttributes
      );
      
      // Navigate to the home page after successful password setup
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to set new password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 relative">
      {/* Logo and Title Top Left */}
      <div className="absolute top-0 left-0 flex items-center gap-3 p-6 z-10">
        <img src="/logo192.png" alt="Pitt Logo" className="h-12 w-12" />
        <span className="text-2xl font-extrabold text-blue-900 tracking-tight">
          Dive Tracker
        </span>
      </div>
      {/* Left: Login Form, full white */}
      <div className="flex flex-1 items-center justify-center py-16 md:py-0 bg-white min-h-screen">
        <div className="w-full max-w-md flex flex-col items-center">
          <h2 className="text-3xl font-extrabold text-blue-900 mb-2 mt-2 md:mt-0">
            {isNewPasswordRequired
              ? "Complete Your Profile"
              : isForgotPassword 
                ? "Reset Your Password" 
                : "Welcome back, diving boss!"}
          </h2>
          <p className="text-blue-700 text-sm font-medium mb-12">
            {isNewPasswordRequired
              ? "Please set a new password and provide your information to continue."
              : isForgotPassword 
                ? resetRequested 
                  ? "Enter the code sent to your email along with your new password." 
                  : "Enter your username to receive a password reset code."
                : "Log in to manage your team's training logs and competition data."}
          </p>
          
          {isNewPasswordRequired ? (
            // New Password Required Form
            <form onSubmit={handleCompleteNewPassword} className="w-full">
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                />
              </div>
              <div className="mb-10">
                <label className="block mb-2 font-semibold text-blue-800">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                />
              </div>
              {error && (
                <div className="text-red-500 mb-6 text-center font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? "Processing..." : "Complete Profile"}
              </button>
            </form>
          ) : !isForgotPassword ? (
            // Login Form
            <form onSubmit={handleSubmit} className="w-full">
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-10">
                <label className="block mb-2 font-semibold text-blue-800">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                />
              </div>
              {error && (
                <div className="text-red-500 mb-6 text-center font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : resetRequested ? (
            // Reset Password Form (after code is sent)
            <form onSubmit={handleResetPassword} className="w-full">
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                  disabled
                />
              </div>
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-10">
                <label className="block mb-2 font-semibold text-blue-800">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                />
              </div>
              {error && (
                <div className="text-red-500 mb-6 text-center font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? "Processing..." : "Reset Password"}
              </button>
            </form>
          ) : (
            // Request Password Reset Form
            <form onSubmit={handleForgotPasswordRequest} className="w-full">
              <div className="mb-8">
                <label className="block mb-2 font-semibold text-blue-800">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-lg"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="text-red-500 mb-6 text-center font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? "Processing..." : "Send Reset Code"}
              </button>
            </form>
          )}
          
          {/* Password Reset Toggle Link */}
          {!isNewPasswordRequired && (
            <div className="mt-6 text-center">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  if (isForgotPassword) {
                    setIsForgotPassword(false);
                    setResetRequested(false);
                    setResetCode("");
                    setNewPassword("");
                    setError(null);
                  } else {
                    setIsForgotPassword(true);
                    setError(null);
                  }
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {isForgotPassword ? "Back to Login" : "Forgot Password?"}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Right: Hero Image (hidden on mobile) */}
      <div
        className="hidden md:flex flex-1 relative min-h-screen"
        style={{ background: "#b3d8fd" }}
      >
        <img
          src="/login-hero.png"
          alt="Diving Hero"
          className="absolute inset-0 w-full h-full object-contain object-center"
          style={{ zIndex: 1 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>
  );
};

export default AuthPage;
