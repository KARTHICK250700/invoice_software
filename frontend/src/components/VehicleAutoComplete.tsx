import { useState, useEffect, useRef } from 'react';
import { Car, Search, Check, X } from 'lucide-react';
import axios from 'axios';
import { logger } from '../utils/logger';

interface Vehicle {
  id: number;
  registration_number: string;
  brand_name: string;
  model_name: string;
  client_name: string;
}

interface VehicleAutoCompleteProps {
  selectedVehicle: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle | null) => void;
  required?: boolean;
  clientId?: number; // Optional filter by specific client
}

export default function VehicleAutoComplete({
  selectedVehicle,
  onVehicleSelect,
  required = false,
  clientId
}: VehicleAutoCompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipSearchRef = useRef(false); // prevents searching when term is set programmatically

  // Debounce search
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        setIsLoading(true);
        let searchUrl = `/api/vehicles/?search=${searchTerm}&limit=10`;

        // Filter by client if specified
        if (clientId) {
          searchUrl += `&client_id=${clientId}`;
        }

        const response = await axios.get(searchUrl);
        const vehicleData = response.data || [];

        // Log for debugging
        logger.info('Vehicle search response', {
          searchTerm,
          responseStructure: response.data,
          vehicleCount: Array.isArray(vehicleData) ? vehicleData.length : 'Not array',
          isArray: Array.isArray(vehicleData)
        });

        setSuggestions(vehicleData);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Vehicle search failed:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, clientId]);

  // Update search term when selected vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      const brand = selectedVehicle.brand_name || selectedVehicle.brand || '';
      const model = selectedVehicle.model_name || selectedVehicle.model || '';
      const reg = selectedVehicle.registration_number || '';
      const label = [brand, model].filter(Boolean).join(' ');
      skipSearchRef.current = true; // don't trigger API search for pre-filled value
      setSearchTerm(label ? `${label} - ${reg}` : reg);
      setShowDropdown(false);
    } else {
      setSearchTerm('');
    }
  }, [selectedVehicle]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleVehicleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    onVehicleSelect(vehicle);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onVehicleSelect(null);
    setSearchTerm('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      onVehicleSelect(null);
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Vehicle {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search by registration number, make/model..."
          className="input-field pl-10 pr-10"
          required={required}
        />

        {/* Loading/Success/Clear indicators */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          {selectedVehicle && !isLoading && (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded"
                title="Clear selection"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
              {isLoading ? 'Searching...' : 'No vehicles found'}
            </div>
          ) : (
            (Array.isArray(suggestions) ? suggestions : []).map((vehicle, index) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => handleVehicleSelect(vehicle)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none ${
                  index === highlightedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {vehicle.brand_name} {vehicle.model_name} - {vehicle.registration_number}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Owner: {vehicle.client_name}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}