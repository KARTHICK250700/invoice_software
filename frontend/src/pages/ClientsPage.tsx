import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Download } from 'lucide-react';
import axios from 'axios';
import ClientModal from '../components/ClientModal';
import SecureDeleteModal from '../components/SecureDeleteModal';
import PageHeader, { QuickStats } from '../components/UI/PageHeader';
import ModernCard, { CardHeader, CardContent, CardActions, ModernButton } from '../components/UI/ModernCard';
import { LoadingState, EmptyState, CardSkeleton } from '../components/UI/LoadingSkeletons';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', searchTerm],
    queryFn: () => axios.get(`/api/clients?search=${searchTerm}`).then(res => res.data),
  });

  const deleteClientMutation = useMutation({
    mutationFn: ({ clientId, password }: { clientId: number; password: string }) =>
      axios.delete(`/api/clients/${clientId}`, { data: { password } }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      alert(data.data.message || 'Client deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete client';
      throw new Error(errorMessage);
    },
  });

  const handleAddClient = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDeleteClient = (client: any) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (password: string) => {
    if (!clientToDelete) return;

    try {
      await deleteClientMutation.mutateAsync({
        clientId: clientToDelete.id,
        password
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleExportClientsCSV = () => {
    if (!clients || clients.length === 0) {
      alert('No client data available to export');
      return;
    }

    // Create CSV data
    const csvData = [];

    // Add report header
    csvData.push(['Client Database Export']);
    csvData.push(['Generated Date', new Date().toLocaleDateString('en-GB')]);
    csvData.push(['Generated Time', new Date().toLocaleTimeString('en-GB')]);
    csvData.push(['Total Clients', clients.length]);
    csvData.push(['']); // Empty row

    // Add client data headers
    csvData.push([
      'Client ID',
      'Name',
      'Phone',
      'Mobile',
      'Email',
      'Address',
      'City',
      'State',
      'PIN Code',
      'Total Vehicles',
      'Total Invoices',
      'Outstanding Amount INR',
    ]);

    // Add client data
    clients.forEach(client => {
      csvData.push([
        client.id || '',
        client.name || '',
        client.phone || '',
        client.mobile || '',
        client.email || '',
        client.address || '',
        client.city || '',
        client.state || '',
        client.pincode || '',
        client.total_vehicles || 0,
        client.total_invoices || 0,
        client.outstanding_amount || 0,
      ]);
    });

    // Add summary statistics
    csvData.push(['']); // Empty row
    csvData.push(['SUMMARY STATISTICS']);
    csvData.push(['Total Outstanding Amount INR', clients.reduce((sum, client) => sum + (client.outstanding_amount || 0), 0)]);
    csvData.push(['Average Outstanding per Client INR', (clients.reduce((sum, client) => sum + (client.outstanding_amount || 0), 0) / clients.length).toFixed(2)]);
    csvData.push(['Clients with Outstanding Amount', clients.filter(client => (client.outstanding_amount || 0) > 0).length]);
    csvData.push(['Total Vehicle Count', clients.reduce((sum, client) => sum + (client.total_vehicles || 0), 0)]);
    csvData.push(['Total Invoice Count', clients.reduce((sum, client) => sum + (client.total_invoices || 0), 0)]);

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
    link.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading clients..." />;
  }

  // Prepare quick stats
  const quickStatsData = [
    {
      label: 'Total Clients',
      value: clients?.length || 0,
      trend: '+5 this month',
      trendDirection: 'up' as const,
      icon: Users,
      color: 'blue' as const
    },
    {
      label: 'Total Outstanding',
      value: `₹${clients?.reduce((sum, client) => sum + (client.outstanding_amount || 0), 0).toLocaleString() || 0}`,
      trend: '+12%',
      trendDirection: 'up' as const,
      icon: MapPin,
      color: 'green' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Page Header */}
      <PageHeader
        title="Clients"
        description="Manage your customer database and relationships"
        breadcrumbs={[{ label: 'Clients' }]}
        actions={
          <div className="flex gap-3">
            <ModernButton
              variant="secondary"
              icon={Download}
              onClick={handleExportClientsCSV}
              disabled={!clients || clients.length === 0}
            >
              Export CSV ({clients?.length || 0})
            </ModernButton>
            <ModernButton
              variant="primary"
              icon={Plus}
              onClick={handleAddClient}
            >
              Add Client
            </ModernButton>
          </div>
        }
        stats={<QuickStats stats={quickStatsData} />}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Filters */}
        <ModernCard className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <ModernButton variant="secondary">
                Filter
              </ModernButton>
            </div>
          </CardContent>
        </ModernCard>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients?.length > 0 ? (
            clients.map((client: any) => (
              <ModernCard key={client.id} hover={true}>
                <CardHeader
                  title={client.name}
                  subtitle={`ID: ${client.id}`}
                  icon={Users}
                  badge={client.total_invoices > 0 ? `${client.total_invoices} invoices` : undefined}
                  color="blue"
                  actions={
                    <div className="flex gap-2">
                      <ModernButton
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        onClick={() => handleEditClient(client)}
                      />
                      <ModernButton
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteClient(client)}
                      />
                    </div>
                  }
                />

                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <span>{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-green-500" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-purple-500" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{client.total_vehicles || 0}</p>
                      <p className="text-xs text-gray-500">Vehicles</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{client.total_invoices || 0}</p>
                      <p className="text-xs text-gray-500">Invoices</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-orange-600">₹{client.outstanding_amount?.toLocaleString() || 0}</p>
                      <p className="text-xs text-gray-500">Outstanding</p>
                    </div>
                  </div>
                </CardContent>
              </ModernCard>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={Users}
                title="No clients found"
                description="Get started by adding your first client to manage your customer database"
                action={
                  <ModernButton variant="primary" icon={Plus} onClick={handleAddClient}>
                    Add Client
                  </ModernButton>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Client Modal */}
      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={closeModal}
          client={editingClient}
        />
      )}

      {/* Secure Delete Modal */}
      <SecureDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemType="Client"
        itemName={clientToDelete?.name || ''}
        description={`Phone: ${clientToDelete?.phone || ''} | Vehicles: ${clientToDelete?.total_vehicles || 0} | Invoices: ${clientToDelete?.total_invoices || 0}`}
      />
    </div>
  );
}