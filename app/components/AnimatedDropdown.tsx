'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface AnimatedDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AnimatedDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Find current selected option
  const selectedOption = options.find(opt => opt.value === value);
  
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
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center justify-between gap-2
          px-3 py-2 min-w-[140px]
          bg-zinc-900 border border-white/10 rounded-lg
          text-sm text-white
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50
          cursor-pointer transition-all duration-200
          ${isOpen ? 'border-cyan-500/50 ring-2 ring-cyan-500/20' : ''}
        `}
      >
        <span className={selectedOption ? 'text-white' : 'text-zinc-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </motion.span>
      </motion.button>
      
      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="
              absolute top-full left-0 right-0 mt-1 z-50
              bg-zinc-900 border border-white/10 rounded-lg
              shadow-xl shadow-black/50
              overflow-hidden
              max-h-[280px] overflow-y-auto
            "
          >
            {options.map((option, index) => (
              <motion.button
                key={option.value}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.15, 
                  delay: index * 0.03,
                  ease: [0.4, 0, 0.2, 1]
                }}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center justify-between gap-2
                  px-3 py-2.5 text-sm text-left
                  transition-colors duration-150
                  ${value === option.value 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-white hover:bg-white/5'
                  }
                `}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
