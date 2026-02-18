import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Plus, Search, Edit, Trash2, User, Calendar, Fuel, Download } from 'lucide-react';
import axios from 'axios';
import VehicleModal from '../components/VehicleModal';
import SecureDeleteModal from '../components/SecureDeleteModal';

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', searchTerm],
    queryFn: () => axios.get(`/api/vehicles?search=${searchTerm}`).then(res => res.data),
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: ({ vehicleId, password }: { vehicleId: number; password: string }) =>
      axios.delete(`/api/vehicles/${vehicleId}`, { data: { password } }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      alert(data.data.message || 'Vehicle deleted successfully');
    },
    onError: (error: any) => {
      throw new Error(error.response?.data?.detail || 'Failed to delete vehicle');
    }
  });

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleEditVehicle = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDeleteVehicle = (vehicle: any) => {
    setVehicleToDelete(vehicle);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (password: string) => {
    if (!vehicleToDelete) return;

    try {
      await deleteVehicleMutation.mutateAsync({
        vehicleId: vehicleToDelete.id,
        password
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setVehicleToDelete(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleExportVehiclesCSV = () => {
    if (!vehicles || vehicles.length === 0) {
      alert('No vehicle data available to export');
      return;
    }

    // Create CSV data
    const csvData = [];

    // Add report header
    csvData.push(['Vehicle Database Export']);
    csvData.push(['Generated Date', new Date().toLocaleDateString('en-GB')]);
    csvData.push(['Generated Time', new Date().toLocaleTimeString('en-GB')]);
    csvData.push(['Total Vehicles', vehicles.length]);
    csvData.push(['']); // Empty row

    // Add vehicle data headers
    csvData.push([
      'Vehicle ID',
      'Vehicle Number',
      'Owner Name',
      'Owner Phone',
      'Make',
      'Model',
      'Year',
      'Engine Number',
      'Chassis Number',
      'Color',
      'Fuel Type',
      'Insurance Expiry',
      'Registration Date',
      'Last Service',
      'Odometer Reading',
      'Status'
    ]);

    // Add vehicle data
    vehicles.forEach(vehicle => {
      csvData.push([
        vehicle.id || '',
        vehicle.vehicle_number || '',
        vehicle.owner_name || '',
        vehicle.owner_phone || '',
        vehicle.make || '',
        vehicle.model || '',
        vehicle.year || '',
        vehicle.engine_number || '',
        vehicle.chassis_number || '',
        vehicle.color || '',
        vehicle.fuel_type || '',
        vehicle.insurance_expiry || '',
        vehicle.registration_date || '',
        vehicle.last_service_date || '',
        vehicle.odometer_reading || '',
        vehicle.status || 'Active'
      ]);
    });

    // Add summary statistics
    csvData.push(['']); // Empty row
    csvData.push(['SUMMARY STATISTICS']);
    csvData.push(['Total Vehicles', vehicles.length]);
    csvData.push(['Unique Makes', [...new Set(vehicles.map(v => v.make).filter(Boolean))].length]);
    csvData.push(['Unique Models', [...new Set(vehicles.map(v => v.model).filter(Boolean))].length]);
    csvData.push(['Vehicles with Insurance Data', vehicles.filter(v => v.insurance_expiry).length]);
    csvData.push(['Vehicles with Service History', vehicles.filter(v => v.last_service_date).length]);
    csvData.push(['Average Year', vehicles.filter(v => v.year).reduce((sum, v) => sum + parseInt(v.year), 0) / vehicles.filter(v => v.year).length || 0]);

    // Fuel type distribution
    const fuelTypes = vehicles.reduce((acc, vehicle) => {
      const fuel = vehicle.fuel_type || 'Unknown';
      acc[fuel] = (acc[fuel] || 0) + 1;
      return acc;
    }, {});

    csvData.push(['']); // Empty row
    csvData.push(['FUEL TYPE DISTRIBUTION']);
    Object.entries(fuelTypes).forEach(([fuel, count]) => {
      csvData.push([fuel, count]);
    });

    // Convert to CSV string
    const csvString = csvData.map(row =>
      row.map(cell =>
        typeof cell === 'string' && cell.includes(',')
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicles-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600 mt-1">Manage vehicle database</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportVehiclesCSV}
            className="btn-secondary"
            disabled={!vehicles || vehicles.length === 0}
          >
            <Download className="w-4 h-4" />
            Export CSV ({vehicles?.length || 0} vehicles)
          </button>
          <button onClick={handleAddVehicle} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by registration number, brand, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button className="btn-secondary">
            Filter
          </button>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))
        ) : vehicles?.length > 0 ? (
          vehicles.map((vehicle: any) => (
            <div key={vehicle.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{vehicle.registration_number}</h3>
                    <p className="text-sm text-gray-500">{vehicle.brand_name} {vehicle.model_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditVehicle(vehicle)}
                    className="p-2 text-gray-400 hover:text-primary-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(vehicle)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{vehicle.client_name}</span>
                </div>
                {vehicle.year && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{vehicle.year}</span>
                  </div>
                )}
                {vehicle.fuel_type && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Fuel className="w-4 h-4" />
                    <span>{vehicle.fuel_type}</span>
                  </div>
                )}
                {vehicle.color && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: vehicle.color }}></div>
                    <span>{vehicle.color}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{vehicle.mileage?.toLocaleString() || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Mileage (km)</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-primary-600">Active</p>
                    <p className="text-xs text-gray-500">Status</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full card text-center py-12">
            <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first vehicle</p>
            <button onClick={handleAddVehicle} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Modal */}
      <VehicleModal
        isOpen={isModalOpen}
        onClose={closeModal}
        vehicle={editingVehicle}
      />

      {/* Secure Delete Modal */}
      <SecureDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemType="Vehicle"
        itemName={vehicleToDelete?.registration_number || ''}
        description={`Client: ${vehicleToDelete?.client_name || ''} | ${vehicleToDelete?.brand_name || ''} ${vehicleToDelete?.model_name || ''}`}
      />
    </div>
  );
}