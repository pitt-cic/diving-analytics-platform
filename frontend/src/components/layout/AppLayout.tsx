import React, { useState, createContext } from "react";
import Sidebar from "./Sidebar";

// Context to provide sidebar open handler to pages
export const SidebarContext = createContext<
  | {
      onOpenSidebar: () => void;
    }
  | undefined
>(undefined);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ onOpenSidebar: () => setIsMobileOpen(true) }}
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          isMobileOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
