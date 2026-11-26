import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, CheckSquare, Square } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
  description?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  showSelectAll?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  error,
  helperText,
  disabled = false,
  className = '',
  showSelectAll = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(q) || 
      (opt.category && opt.category.toLowerCase().includes(q)) ||
      (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Selected item lookup
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const toggleOption = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    const available = filteredOptions.filter(o => !o.disabled).map(o => o.value);
    const combined = Array.from(new Set([...selectedValues, ...available]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className={`relative w-full space-y-1.5 font-sans ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-semibold text-zinc-700">
            {label}
          </label>
          {selectedValues.length > 0 && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              {selectedValues.length} selected
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full min-h-[48px] sm:min-h-[42px] px-3.5 sm:px-3 py-2
          text-left text-base sm:text-sm bg-white rounded-xl border transition-all duration-150
          flex items-center justify-between gap-2 touch-manipulation cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
          disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed
          ${error 
            ? 'border-rose-400 bg-rose-50/20' 
            : isOpen 
              ? 'border-orange-500 ring-2 ring-orange-500/20' 
              : 'border-zinc-300 hover:border-zinc-400'
          }
        `}
      >
        <div className="flex-1 flex flex-wrap items-center gap-1.5 overflow-hidden">
          {selectedValues.length === 0 ? (
            <span className="text-zinc-400 truncate">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-zinc-900 text-xs sm:text-sm">
                {selectedValues.length === 1
                  ? options.find(o => o.value === selectedValues[0])?.label || '1 item selected'
                  : `${selectedValues.length} items selected`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
          {selectedValues.length > 0 && !disabled && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="p-1 hover:text-zinc-700 rounded-md hover:bg-zinc-100 transition-colors"
              title="Clear all"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu / Mobile Bottom Sheet */}
      {isOpen && (
        <div 
          className={`
            fixed sm:absolute inset-x-2 bottom-2 sm:inset-x-0 sm:bottom-auto sm:top-full z-50 sm:mt-1.5
            bg-white rounded-2xl sm:rounded-xl border border-zinc-200 shadow-xl
            max-h-[75vh] sm:max-h-72 flex flex-col overflow-hidden animate-in fade-in duration-150
          `}
        >
          {/* Search Box */}
          <div className="p-2.5 sm:p-2 border-b border-zinc-100 bg-zinc-50/60 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions (Select All / Clear All) */}
            {showSelectAll && filteredOptions.length > 0 && (
              <div className="flex items-center justify-between pt-2 px-1 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-orange-600 hover:text-orange-700 font-semibold cursor-pointer py-1"
                >
                  Select all ({filteredOptions.length})
                </button>
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-zinc-500 hover:text-zinc-800 font-semibold cursor-pointer py-1"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Option List */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-zinc-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400 font-sans">
                No matching options found.
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && toggleOption(opt.value)}
                    className={`
                      min-h-[44px] px-3 py-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer
                      transition-colors touch-manipulation select-none
                      ${isSelected ? 'bg-orange-50/70 text-orange-950 font-semibold' : 'hover:bg-zinc-50 text-zinc-800'}
                      ${opt.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
                    `}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div
                        className={`
                          w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-all
                          ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-zinc-300 bg-white'}
                        `}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <span className="text-xs sm:text-sm block truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-xs text-zinc-400 block truncate font-normal">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {opt.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 shrink-0 font-normal">
                        {opt.category}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Done Footer */}
          <div className="p-2 border-t border-zinc-100 bg-zinc-50/80 sm:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-zinc-900 text-white text-xs font-bold py-2 shadow-xs"
            >
              Done ({selectedValues.length} selected)
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs text-rose-600 font-medium pl-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 pl-1">{helperText}</p>
      ) : null}
    </div>
  );
};
