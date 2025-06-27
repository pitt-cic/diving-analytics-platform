import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { NavItem } from "../../types";

const navigation: NavItem[] = [
  { name: "Dashboard", to: "/", icon: HomeIcon },
  { name: "Dive Log", to: "/dive-log", icon: ClipboardDocumentListIcon },
  { name: "Divers", to: "/divers", icon: UserGroupIcon },
  { name: "Analytics", to: "/analytics", icon: ChartBarIcon },
  { name: "Settings", to: "/settings", icon: Cog6ToothIcon },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeDrawer = () => setIsMobileOpen(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="mt-8 flex-1 px-2 space-y-1">
      {navigation.map((item) => {
        const current = location.pathname === item.to;
        return (
          <Link
            key={item.name}
            to={item.to}
            onClick={onClick}
            className={`
              group flex items-center px-2 py-2 text-sm font-medium rounded-md
              ${
                current
                  ? "bg-primary-900 text-white"
                  : "text-primary-100 hover:bg-primary-700 hover:text-white"
              }
            `}
          >
            <item.icon
              className={`
                mr-3 flex-shrink-0 h-6 w-6
                ${
                  current
                    ? "text-primary-300"
                    : "text-primary-300 group-hover:text-primary-200"
                }
              `}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/*  Mobile */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md focus:outline-none transition-transform duration-200"
        >
          <Bars3Icon className="h-7 w-7 text-black" />
        </button>
      )}

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={closeDrawer}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between bg-[#003594] px-4 py-4">
          <span className="text-white text-2xl font-bold">DiveTracker</span>
          <button
            onClick={closeDrawer}
            className="p-1 rounded-md focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="flex flex-col h-full bg-[#003594] overflow-y-auto">
          <NavLinks onClick={closeDrawer} />
        </div>
      </div>

      {/* Desktop*/}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-[#003594]">
            <div className="flex items-center flex-shrink-0 px-4 py-5">
              <span className="text-white text-2xl font-bold">DiveTracker</span>
            </div>
            <NavLinks />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
