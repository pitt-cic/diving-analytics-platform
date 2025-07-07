import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await Auth.signIn(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
            Welcome back, diving boss!
          </h2>
          <p className="text-blue-700 text-sm font-medium mb-12">
            Log in to manage your team's training logs and competition data.
          </p>
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
