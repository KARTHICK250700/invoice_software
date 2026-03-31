import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Car, Calendar, Fuel, Settings, ChevronDown, Check, Search } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';


interface Vehicle {
  id?: number;
  registration_number: string;
  brand: string;
  model: string;
  year: number;
  fuel_type?: string;
  transmission?: string;
  vehicle_type?: string;
  client_id: number;
  vin_number?: string;
  chassis_number?: string;
  engine_number?: string;
  color?: string;
  insurance_expiry?: string;
  puc_expiry?: string;
  notes?: string;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle;
}

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const TRANSMISSION_TYPES = ['Manual', 'Automatic', 'CVT', 'AMT'];
const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Coupe', 'Convertible', 'Pickup', 'Van'];

export default function VehicleModal({ isOpen, onClose, vehicle }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    client_id: vehicle?.client_id || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    registration_number: vehicle?.registration_number || vehicle?.vehicle_number || '',
    vin_number: vehicle?.vin_number || '',
    fuel_type: vehicle?.fuel_type || 'Petrol',
    transmission: vehicle?.transmission || 'Manual',
    vehicle_type: vehicle?.vehicle_type || 'Hatchback',
    color: vehicle?.color || '',
    engine_number: vehicle?.engine_number || '',
    chassis_number: vehicle?.chassis_number || '',
    insurance_expiry: vehicle?.insurance_expiry || '',
    puc_expiry: vehicle?.puc_expiry || '',
    notes: vehicle?.notes || ''
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedBrandForSuggestions, setSelectedBrandForSuggestions] = useState<string>('');

  // UI state for custom dropdowns
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  // Refs for dropdown positioning
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // Fetch brands for suggestions
  const { data: brandsData } = useQuery({
    queryKey: ['brands-suggestions'],
    queryFn: () => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get('/api/vehicles/brands', { headers }).then(res => res.data.data || []);
    },
  });

  // Fetch models for suggestions
  const { data: modelsData } = useQuery({
    queryKey: ['models-suggestions'],
    queryFn: () => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get('/api/vehicles/models', { headers }).then(res => res.data.data || {});
    },
  });

  // Fetch client details when vehicle has client_id
  const { data: clientData } = useQuery({
    queryKey: ['client', vehicle?.client_id],
    queryFn: () => {
      if (!vehicle?.client_id) return Promise.resolve(null);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get(`/api/clients/${vehicle.client_id}`, { headers }).then(res => res.data.data || res.data);
    },
    enabled: !!vehicle?.client_id,
  });

  // Update formData when vehicle prop changes (for editing)
  useEffect(() => {
    if (vehicle) {
      // Edit mode - populate form with vehicle data
      setFormData({
        client_id: vehicle.client_id || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        registration_number: vehicle.registration_number || vehicle.vehicle_number || '',
        vin_number: vehicle.vin_number || '',
        fuel_type: vehicle.fuel_type || 'Petrol',
        transmission: vehicle.transmission || 'Manual',
        vehicle_type: vehicle.vehicle_type || 'Hatchback',
        color: vehicle.color || '',
        engine_number: vehicle.engine_number || '',
        chassis_number: vehicle.chassis_number || '',
        insurance_expiry: vehicle.insurance_expiry || '',
        puc_expiry: vehicle.puc_expiry || '',
        notes: vehicle.notes || ''
      });

      // Set client from vehicle data (includes client details) or separate client query
      if (vehicle.client_name) {
        // Use client data already included in vehicle response
        setSelectedClient({
          id: vehicle.client_id,
          name: vehicle.client_name,
          phone: vehicle.client_phone,
          mobile: vehicle.client_mobile || vehicle.client_phone,
          email: vehicle.client_email,
          address: vehicle.client_address,
          city: vehicle.client_city,
          state: vehicle.client_state,
          pincode: vehicle.client_pincode
        });
      } else if (clientData && vehicle.client_id) {
        // Fallback to separate client query only if this vehicle has a client_id
        setSelectedClient(clientData);
      }
    } else {
      // Add mode - reset everything
      setFormData({
        client_id: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        registration_number: '',
        vin_number: '',
        fuel_type: 'Petrol',
        transmission: 'Manual',
        vehicle_type: 'Hatchback',
        color: '',
        engine_number: '',
        chassis_number: '',
        insurance_expiry: '',
        puc_expiry: '',
        notes: ''
      });
      setSelectedClient(null);
    }
  }, [vehicle, clientData]);


  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return axios.post('/api/vehicles/', data, { headers }).then(res => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
      resetForm();
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return axios.put(`/api/vehicles/${vehicle.id}`, data, { headers }).then(res => res.data.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      client_id: selectedClient?.id || formData.client_id,
      year: parseInt(formData.year) || new Date().getFullYear() // Convert year to integer
    };

    if (vehicle) {
      updateVehicleMutation.mutate(submitData);
    } else {
      createVehicleMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update brand for model suggestions when brand changes
    if (name === 'brand') {
      setSelectedBrandForSuggestions(value);
      // Reset model when brand changes
      if (formData.model) {
        setFormData(prev => ({ ...prev, model: '' }));
      }
    }
  };

  // Filter brands based on search term
  const filteredBrands = brandsData?.filter((brand: any) =>
    brand.name.toLowerCase().includes(brandSearchTerm.toLowerCase())
  ) || [];

  // Filter models based on search term and selected brand
  const getFilteredModels = () => {
    if (!selectedBrandForSuggestions || !modelsData?.[selectedBrandForSuggestions]) {
      return [];
    }

    return modelsData[selectedBrandForSuggestions].filter((model: any) =>
      model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
  };

  const filteredModels = getFilteredModels();

  // Handle brand selection
  const handleBrandSelect = (brandName: string) => {
    setFormData(prev => ({ ...prev, brand: brandName, model: '' })); // Reset model
    setSelectedBrandForSuggestions(brandName);
    setBrandSearchTerm('');
    setShowBrandDropdown(false);
  };

  // Handle model selection
  const handleModelSelect = (modelName: string) => {
    setFormData(prev => ({ ...prev, model: modelName }));
    setModelSearchTerm('');
    setShowModelDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setShowBrandDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setFormData({
      client_id: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      registration_number: '',
      vin_number: '',
      fuel_type: 'Petrol',
      transmission: 'Manual',
      vehicle_type: 'Hatchback',
      color: '',
      engine_number: '',
      chassis_number: '',
      insurance_expiry: '',
      puc_expiry: '',
      notes: ''
    });
    setSelectedClient(null);
    setSelectedBrandForSuggestions('');
    setBrandSearchTerm('');
    setModelSearchTerm('');
    setShowBrandDropdown(false);
    setShowModelDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Selection */}
          <VehicleOwnerSearch
            selectedClient={selectedClient}
            onClientSelect={setSelectedClient}
            required={true}
          />

          {/* Vehicle Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Brand - Custom Dropdown */}
            <div className="relative" ref={brandDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Car className="w-4 h-4 inline mr-1" />
                Brand/Make *
              </label>
              <div
                className="relative cursor-pointer"
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
              >
                <div className={`input-field pr-10 flex items-center justify-between ${!formData.brand ? 'text-gray-400' : 'text-gray-900'}`}>
                  <span>{formData.brand || 'Select Brand'}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${showBrandDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showBrandDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search brands..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={brandSearchTerm}
                          onChange={(e) => setBrandSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredBrands.length > 0 ? (
                        filteredBrands.map((brand: any) => (
                          <div
                            key={brand.name}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between ${
                              formData.brand === brand.name ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                            }`}
                            onClick={() => handleBrandSelect(brand.name)}
                          >
                            <span className="font-medium">{brand.name}</span>
                            {formData.brand === brand.name && <Check className="w-4 h-4 text-blue-700" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No brands found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Model - Custom Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="w-4 h-4 inline mr-1" />
                Model *
              </label>
              <div
                className={`relative ${!formData.brand ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => formData.brand && setShowModelDropdown(!showModelDropdown)}
              >
                <div className={`input-field pr-10 flex items-center justify-between ${
                  !formData.brand ? 'bg-gray-100 text-gray-400' :
                  !formData.model ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  <span>
                    {!formData.brand ? 'Select brand first' :
                     formData.model || 'Select Model'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showModelDropdown && formData.brand && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search models..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={modelSearchTerm}
                          onChange={(e) => setModelSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredModels.length > 0 ? (
                        filteredModels.map((model: any) => (
                          <div
                            key={model.name}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between ${
                              formData.model === model.name ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                            }`}
                            onClick={() => handleModelSelect(model.name)}
                          >
                            <span className="font-medium">{model.name}</span>
                            {formData.model === model.name && <Check className="w-4 h-4 text-blue-700" />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No models found for {formData.brand}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manufacturing Year *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                min="1980"
                max={new Date().getFullYear() + 1}
                className="input-field"
              />
            </div>
          </div>

          {/* Registration and VIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Car className="w-4 h-4 inline mr-1" />
                Registration Number *
              </label>
              <input
                type="text"
                name="registration_number"
                value={formData.registration_number}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="e.g., TN 01 AB 1234"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* VIN Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VIN Number
              </label>
              <input
                type="text"
                name="vin_number"
                value={formData.vin_number}
                onChange={handleChange}
                className="input-field"
                placeholder="Vehicle Identification Number"
              />
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Fuel className="w-4 h-4 inline mr-1" />
                Fuel Type *
              </label>
              <select
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleChange}
                required
                className="input-field"
              >
                {FUEL_TYPES.map((fuel) => (
                  <option key={fuel} value={fuel}>
                    {fuel}
                  </option>
                ))}
              </select>
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="w-4 h-4 inline mr-1" />
                Transmission *
              </label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                required
                className="input-field"
              >
                {TRANSMISSION_TYPES.map((transmission) => (
                  <option key={transmission} value={transmission}>
                    {transmission}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                required
                className="input-field"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Red, White, Black"
              />
            </div>
          </div>

          {/* Engine and Chassis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engine Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Settings className="w-4 h-4 inline mr-1" />
                Engine Number
              </label>
              <input
                type="text"
                name="engine_number"
                value={formData.engine_number}
                onChange={handleChange}
                className="input-field"
                placeholder="Engine identification number"
              />
            </div>

            {/* Chassis Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chassis Number
              </label>
              <input
                type="text"
                name="chassis_number"
                value={formData.chassis_number}
                onChange={handleChange}
                className="input-field"
                placeholder="Chassis identification number"
              />
            </div>
          </div>

          {/* Insurance and PUC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insurance Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Insurance Expiry Date
              </label>
              <input
                type="date"
                name="insurance_expiry"
                value={formData.insurance_expiry}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            {/* PUC Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PUC Expiry Date
              </label>
              <input
                type="date"
                name="puc_expiry"
                value={formData.puc_expiry}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="input-field resize-none"
              placeholder="Any additional information about the vehicle..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(createVehicleMutation.isPending || updateVehicleMutation.isPending) ? 'Saving...' : (vehicle ? 'Update Vehicle' : 'Add Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}