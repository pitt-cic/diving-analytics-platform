import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { NavItem } from "../../types";
import { Auth as Amplify } from "aws-amplify";

const navigation: NavItem[] = [
  { name: "Dashboard", to: "/", icon: HomeIcon },
  { name: "Dive Log", to: "/dive-log", icon: ClipboardDocumentListIcon },
  { name: "Divers", to: "/divers", icon: UserGroupIcon },
  { name: "Analytics", to: "/analytics", icon: ChartBarIcon },
  { name: "Settings", to: "/settings", icon: Cog6ToothIcon },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await Amplify.signOut();
    navigate("/login");
  };

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

  const LogoutButton = ({ onClick }: { onClick?: () => void }) => (
    <button
      onClick={onClick || handleLogout}
      className="group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-primary-100 hover:bg-primary-700 hover:text-white mb-4"
      style={{ outline: "none", border: "none", background: "none" }}
    >
      <ArrowLeftOnRectangleIcon
        className="mr-3 flex-shrink-0 h-6 w-6 text-primary-300 group-hover:text-primary-200"
        aria-hidden="true"
      />
      <span className="group-hover:text-white">Logout</span>
    </button>
  );

  return (
    <>
      {/* Mobile: Right Drawer */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
            onClick={onClose}
          />
          <div
            className={`
              fixed inset-y-0 right-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
              md:hidden flex flex-col
              ${isMobileOpen ? "translate-x-0" : "translate-x-full"}
            `}
          >
            <div className="flex items-center justify-between bg-[#003594] px-4 py-4 pt-8">
              <div className="flex items-center gap-2">
                <img src="/logo192.png" alt="Logo" className="h-8 w-8" />
                <span className="text-white text-2xl font-bold">
                  DiveTracker
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex flex-col h-full bg-[#003594] overflow-y-auto flex-1 justify-between">
              <div>
                <NavLinks onClick={onClose} />
              </div>
              <div className="px-2 pb-4">
                <LogoutButton onClick={onClose} />
              </div>
            </div>
          </div>
        </>
      )}
      {/* Desktop Sidebar (unchanged) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 h-screen">
          <div className="flex flex-col h-0 flex-1 bg-[#003594]">
            <div className="flex items-center flex-shrink-0 px-4 py-5">
              <div className="flex items-center gap-4">
                <img src="/logo512.png" alt="Logo" className="h-8 w-8" />
                <span className="text-white text-2xl font-bold">
                  DiveTracker
                </span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <NavLinks />
              </div>
              <div className="px-2 pb-4">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
