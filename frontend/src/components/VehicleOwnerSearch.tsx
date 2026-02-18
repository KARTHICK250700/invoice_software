import { useState, useEffect, useRef } from 'react';
import { User, Search, Check, X } from 'lucide-react';
import axios from 'axios';

interface Client {
  id: number;
  name: string;
  mobile: string;
  phone: string;
}

interface VehicleOwnerSearchProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
  required?: boolean;
}

export default function VehicleOwnerSearch({
  selectedClient,
  onClientSelect,
  required = false
}: VehicleOwnerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/clients/?search=${searchTerm}&limit=10`);
        setSuggestions(response.data || []);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
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

  // Handle keyboard navigation
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
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          selectClient(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectClient = (client: Client) => {
    onClientSelect(client);
    setSearchTerm(`${client.name} - ${client.mobile}`);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setSuggestions([]);
  };

  const clearSelection = () => {
    onClientSelect(null);
    setSearchTerm('');
    setShowDropdown(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear selection if user is typing and current selection doesn't match
    if (selectedClient && value !== `${selectedClient.name} - ${selectedClient.mobile}`) {
      onClientSelect(null);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <User className="w-4 h-4 inline mr-1" />
        Vehicle Owner {required && '*'}
      </label>

      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchTerm.trim() && suggestions.length > 0) {
                setShowDropdown(true);
              }
            }}
            placeholder="Search by customer name or mobile number..."
            required={required && !selectedClient}
            className={`input-field pr-20 ${selectedClient ? 'bg-green-50 border-green-300' : ''}`}
          />

          {/* Icons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            )}
            {selectedClient && (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
            {!selectedClient && !isLoading && (
              <Search className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((client, index) => (
              <div
                key={client.id}
                onClick={() => selectClient(client)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                  index === highlightedIndex ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-sm text-gray-500">{client.mobile}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {client.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showDropdown && searchTerm.trim() && suggestions.length === 0 && !isLoading && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
            No customers found matching "{searchTerm}"
          </div>
        )}
      </div>

      {/* Selected client info */}
      {selectedClient && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <div className="flex items-center justify-between">
            <div>
              <strong>Selected:</strong> {selectedClient.name} - {selectedClient.mobile}
            </div>
            <span className="text-xs text-green-600">✓ Ready</span>
          </div>
        </div>
      )}
    </div>
  );
}