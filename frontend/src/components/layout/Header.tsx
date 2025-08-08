import React from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onOpenSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  right,
  onOpenSidebar,
}) => {
  return (
    <header className="w-full bg-white border-b border-gray-200 h-24 flex items-center px-8 justify-between">
      <div className="flex flex-col items-start flex-1">
        <h1 className="text-black text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-base text-gray-500 mt-1 hidden md:block">
            {subtitle}
          </p>
        )}
      </div>
      {/* Desktop: show right prop; Mobile: show hamburger */}
      <div className="flex items-center">
        <button
          className="block md:hidden p-2 rounded-md focus:outline-none"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-7 w-7 text-black" />
        </button>
        <div className="hidden md:block">{right}</div>
      </div>
    </header>
  );
};

export default Header;
