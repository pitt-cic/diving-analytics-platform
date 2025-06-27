import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Auth as Amplify } from "aws-amplify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { configureAmplify } from "./aws-config";
import AppLayout from "./components/layout/AppLayout";
import { Dashboard, DiveLog, Divers, Auth } from "./pages";

// Initialize Amplify
configureAmplify();

// Initialize React Query
const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(
    null
  );

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      await Amplify.currentAuthenticatedUser();
      setIsAuthenticated(true);
    } catch (err) {
      setIsAuthenticated(true);
    }
  };

  if (isAuthenticated === null) {
    // Still checking auth state
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Auth />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dive-log"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DiveLog />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Add more routes for Divers, Analytics, Settings */}
          <Route
            path="/divers/:diverId"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Divers />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/divers"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Divers />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
