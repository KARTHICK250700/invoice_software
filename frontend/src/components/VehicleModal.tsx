import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Car, Calendar, Fuel, Settings } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';

interface Brand {
  id: number;
  name: string;
  models?: Model[];
}

interface Model {
  id: number;
  name: string;
  brand_id: number;
}

interface Vehicle {
  id?: number;
  registration_number: string;
  brand_id: number;
  model_id: number;
  year: number;
  fuel_type: string;
  transmission: string;
  client_id: number;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: Vehicle;
}

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const VEHICLE_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Coupe', 'Convertible', 'Pickup', 'Van'];

export default function VehicleModal({ isOpen, onClose, vehicle }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    client_id: vehicle?.client_id || '',
    model_id: vehicle?.model_id || '',
    year: vehicle?.year || new Date().getFullYear(),
    registration_number: vehicle?.registration_number || '',
    vin_number: vehicle?.vin_number || '',
    fuel_type: vehicle?.fuel_type || 'Petrol',
    vehicle_type: vehicle?.vehicle_type || 'Hatchback',
    color: vehicle?.color || '',
    engine_number: vehicle?.engine_number || '',
    chassis_number: vehicle?.chassis_number || '',
    insurance_expiry: vehicle?.insurance_expiry || '',
    puc_expiry: vehicle?.puc_expiry || '',
    notes: vehicle?.notes || ''
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch client details when vehicle has client_id
  const { data: clientData } = useQuery({
    queryKey: ['client', vehicle?.client_id],
    queryFn: () => {
      if (!vehicle?.client_id) return Promise.resolve(null);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get(`/api/clients/${vehicle.client_id}`, { headers }).then(res => res.data);
    },
    enabled: !!vehicle?.client_id,
  });

  // Update formData when vehicle prop changes (for editing)
  useEffect(() => {
    if (vehicle) {
      setFormData({
        client_id: vehicle.client_id || '',
        model_id: vehicle.model_id || '',
        year: vehicle.year || new Date().getFullYear(),
        registration_number: vehicle.registration_number || '',
        vin_number: vehicle.vin_number || '',
        fuel_type: vehicle.fuel_type || 'Petrol',
        vehicle_type: vehicle.vehicle_type || 'Hatchback',
        color: vehicle.color || '',
        engine_number: vehicle.engine_number || '',
        chassis_number: vehicle.chassis_number || '',
        insurance_expiry: vehicle.insurance_expiry || '',
        puc_expiry: vehicle.puc_expiry || '',
        notes: vehicle.notes || ''
      });

      // Set client when client data is available
      if (clientData) {
        setSelectedClient(clientData);
      }
    }
  }, [vehicle, clientData]);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get('/api/vehicles/brands', { headers }).then(res => res.data);
    },
  });

  // Fetch models for selected brand
  const { data: models } = useQuery({
    queryKey: ['models', selectedBrand?.id],
    queryFn: () => {
      if (!selectedBrand) return Promise.resolve([]);
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get(`/api/vehicles/models/${selectedBrand.id}`, { headers }).then(res => res.data);
    },
    enabled: !!selectedBrand?.id,
  });

  // Initialize selected brand and model when editing
  useEffect(() => {
    if (vehicle && brands && !selectedBrand) {
      // Find the brand for this vehicle's model
      const vehicleBrand = brands.find(brand =>
        brand.models && brand.models.some(model => model.id === vehicle.model_id)
      );
      if (vehicleBrand) {
        setSelectedBrand(vehicleBrand);
      }
    }
  }, [vehicle, brands, selectedBrand]);

  useEffect(() => {
    if (vehicle && models && selectedBrand && !selectedModel) {
      // Find the specific model for this vehicle
      const vehicleModel = models.find(model => model.id === vehicle.model_id);
      if (vehicleModel) {
        setSelectedModel(vehicleModel);
      }
    }
  }, [vehicle, models, selectedBrand, selectedModel]);

  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return axios.post('/api/vehicles/', data, { headers }).then(res => res.data);
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
      return axios.put(`/api/vehicles/${vehicle.id}`, data, { headers }).then(res => res.data);
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
      model_id: selectedModel?.id || formData.model_id,
      year: parseInt(formData.year) || new Date().getFullYear() // Convert year to integer
    };

    if (vehicle) {
      updateVehicleMutation.mutate(submitData);
    } else {
      createVehicleMutation.mutate(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      model_id: '',
      year: new Date().getFullYear(),
      registration_number: '',
      vin_number: '',
      fuel_type: 'Petrol',
      vehicle_type: 'Hatchback',
      color: '',
      engine_number: '',
      chassis_number: '',
      insurance_expiry: '',
      puc_expiry: '',
      notes: ''
    });
    setSelectedClient(null);
    setSelectedBrand(null);
    setSelectedModel(null);
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
            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand/Make *
              </label>
              <select
                value={selectedBrand?.id || ''}
                onChange={(e) => {
                  const brandId = e.target.value;
                  const brand = brands?.find((b: Brand) => b.id.toString() === brandId);
                  setSelectedBrand(brand || null);
                  setSelectedModel(null); // Reset model when brand changes
                }}
                required
                className="input-field"
              >
                <option value="">Select Brand</option>
                {brands?.map((brand: Brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model *
              </label>
              <select
                value={selectedModel?.id || ''}
                onChange={(e) => {
                  const modelId = e.target.value;
                  const model = models?.find((m: Model) => m.id.toString() === modelId);
                  setSelectedModel(model || null);
                }}
                required
                disabled={!selectedBrand}
                className="input-field"
              >
                <option value="">Select Model</option>
                {models?.map((model: Model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {!selectedBrand && (
                <p className="text-sm text-gray-500 mt-1">Select a brand first</p>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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