/**
 * Select - Composant de sélection réutilisable
 * Support de recherche, multi-select et groupes
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  error,
  helperText,
  required = false,
  disabled = false,
  multiple = false,
  searchable = false,
  clearable = false,
  grouped = false,
  size = 'default',
  className = '',
  containerClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    large: 'px-4 py-3 text-lg'
  };

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les options selon la recherche
  const getFilteredOptions = () => {
    if (!searchTerm) return options;

    if (grouped) {
      return options.map(group => ({
        ...group,
        options: group.options.filter(opt =>
          opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.options.length > 0);
    }

    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Obtenir le label de la valeur sélectionnée
  const getSelectedLabel = () => {
    if (multiple) {
      if (!value || value.length === 0) return null;
      return `${value.length} sélectionné(s)`;
    }

    if (!value) return null;

    if (grouped) {
      for (const group of options) {
        const option = group.options.find(opt => opt.value === value);
        if (option) return option.label;
      }
    } else {
      const option = options.find(opt => opt.value === value);
      return option?.label;
    }

    return null;
  };

  // Gérer la sélection
  const handleSelect = (optionValue) => {
    if (multiple) {
      const newValue = value?.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...(value || []), optionValue];
      onChange({ target: { name, value: newValue } });
    } else {
      onChange({ target: { name, value: optionValue } });
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Effacer la sélection
  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { name, value: multiple ? [] : '' } });
  };

  // Vérifier si une option est sélectionnée
  const isSelected = (optionValue) => {
    if (multiple) {
      return value?.includes(optionValue) || false;
    }
    return value === optionValue;
  };

  const selectedLabel = getSelectedLabel();
  const filteredOptions = getFilteredOptions();

  return (
    <div className={containerClassName} ref={dropdownRef}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Bouton de sélection */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            relative w-full bg-white border rounded-md shadow-sm text-left cursor-default
            ${sizeClasses[size]}
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            ${className}
          `}
        >
          <span className={`block truncate ${!selectedLabel ? 'text-gray-400' : ''}`}>
            {selectedLabel || placeholder}
          </span>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            {clearable && selectedLabel && !disabled ? (
              <button
                onClick={handleClear}
                className="pointer-events-auto p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            ) : (
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`} />
            )}
          </span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {/* Recherche */}
            {searchable && (
              <div className="px-3 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Rechercher..."
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {grouped ? (
                filteredOptions.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.options.map((option) => (
                      <SelectOption
                        key={option.value}
                        option={option}
                        isSelected={isSelected(option.value)}
                        onClick={() => handleSelect(option.value)}
                        multiple={multiple}
                      />
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((option) => (
                  <SelectOption
                    key={option.value}
                    option={option}
                    isSelected={isSelected(option.value)}
                    onClick={() => handleSelect(option.value)}
                    multiple={multiple}
                  />
                ))
              )}

              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  Aucun résultat
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message d'aide ou d'erreur */}
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

// Composant Option
const SelectOption = ({ option, isSelected, onClick, multiple }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100
        ${isSelected ? 'bg-blue-50' : ''}
      `}
    >
      <div className="flex items-center">
        {multiple && (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
          />
        )}
        
        <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
          {option.label}
        </span>
        
        {option.description && (
          <span className="text-xs text-gray-500 ml-2">{option.description}</span>
        )}
      </div>

      {!multiple && isSelected && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
          <Check className="h-5 w-5" />
        </span>
      )}
    </div>
  );
};

export default Select;