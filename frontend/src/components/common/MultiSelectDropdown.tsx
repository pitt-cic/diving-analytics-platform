import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter(v => v !== option)
      : [...selectedValues, option];
    onChange(newValues);
  };

  const handleRemoveOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== option));
  };

  const displayText = selectedValues.length === 0 
    ? placeholder 
    : selectedValues.length === 1 
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className="relative w-full cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {selectedValues.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : selectedValues.length <= 2 ? (
              selectedValues.map(value => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  {value}
                  <XMarkIcon
                    className="h-3 w-3 cursor-pointer hover:text-blue-600"
                    onClick={(e) => handleRemoveOption(value, e)}
                  />
                </span>
              ))
            ) : (
              <span className="text-gray-900">{displayText}</span>
            )}
          </div>
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-sm">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                  selectedValues.includes(option) ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
                onClick={() => handleToggleOption(option)}
              >
                <span>{option}</span>
                {selectedValues.includes(option) && (
                  <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
