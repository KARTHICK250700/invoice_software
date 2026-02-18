import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiService,
  invoiceService,
  quotationService,
  clientService,
  vehicleService,
  serviceService,
  dashboardService,
  getQueryKey,
  handleApiError,
  downloadFile
} from '../services/dynamicApi';

// Generic hook for CRUD operations
export const useCrud = <T>(endpoint: string) => {
  const queryClient = useQueryClient();
  const service = apiService;

  // Get all items
  const useGetAll = (params?: any, enabled: boolean = true) =>
    useQuery({
      queryKey: getQueryKey(endpoint, params),
      queryFn: () => service.getAll<T>(endpoint, params),
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

  // Get single item
  const useGetById = (id: string | number, enabled: boolean = true) =>
    useQuery({
      queryKey: getQueryKey(endpoint, { id }),
      queryFn: () => service.getById<T>(endpoint, id),
      enabled: enabled && !!id,
    });

  // Search items
  const useSearch = (searchTerm: string, params?: any, enabled: boolean = true) =>
    useQuery({
      queryKey: getQueryKey(`${endpoint}/search`, { searchTerm, ...params }),
      queryFn: () => service.search<T>(endpoint, searchTerm, params),
      enabled: enabled && !!searchTerm,
    });

  // Create mutation
  const useCreate = () =>
    useMutation({
      mutationFn: (data: any) => service.create<T>(endpoint, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [endpoint] });
      },
      onError: (error) => {
        console.error(`Failed to create ${endpoint}:`, error);
        throw new Error(handleApiError(error));
      },
    });

  // Update mutation
  const useUpdate = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: any }) =>
        service.update<T>(endpoint, id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [endpoint] });
      },
      onError: (error) => {
        console.error(`Failed to update ${endpoint}:`, error);
        throw new Error(handleApiError(error));
      },
    });

  // Delete mutation
  const useDelete = () =>
    useMutation({
      mutationFn: (id: string | number) => service.delete(endpoint, id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [endpoint] });
      },
      onError: (error) => {
        console.error(`Failed to delete ${endpoint}:`, error);
        throw new Error(handleApiError(error));
      },
    });

  return {
    useGetAll,
    useGetById,
    useSearch,
    useCreate,
    useUpdate,
    useDelete,
  };
};

// Invoice-specific hooks
export const useInvoices = () => {
  const queryClient = useQueryClient();

  const useGetInvoices = (filters?: any) =>
    useQuery({
      queryKey: getQueryKey('invoices', filters),
      queryFn: () => invoiceService.getInvoices(filters),
      staleTime: 30000, // 30 seconds
    });

  const useCreateInvoice = () =>
    useMutation({
      mutationFn: (data: any) => invoiceService.createInvoice(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
      onError: (error) => {
        console.error('Failed to create invoice:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useUpdateInvoice = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: any }) =>
        invoiceService.updateInvoice(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      },
      onError: (error) => {
        console.error('Failed to update invoice:', error);
        throw new Error(handleApiError(error));
      },
    });

  const usePreviewInvoice = (id: string | number, enabled: boolean = false) =>
    useQuery({
      queryKey: ['invoices', id, 'preview'],
      queryFn: () => invoiceService.previewInvoice(id),
      enabled: enabled && !!id,
    });


  const useViewByQR = (accessCode: string, enabled: boolean = true) =>
    useQuery({
      queryKey: ['invoices', 'qr', accessCode],
      queryFn: () => invoiceService.viewByQR(accessCode),
      enabled: enabled && !!accessCode,
    });

  return {
    useGetInvoices,
    useCreateInvoice,
    useUpdateInvoice,
    usePreviewInvoice,
    useViewByQR,
  };
};

// Quotation-specific hooks
export const useQuotations = () => {
  const queryClient = useQueryClient();

  const useGetQuotations = (filters?: any) =>
    useQuery({
      queryKey: getQueryKey('quotations', filters),
      queryFn: () => quotationService.getQuotations(filters),
      staleTime: 30000,
    });

  const useCreateQuotation = () =>
    useMutation({
      mutationFn: (data: any) => quotationService.createQuotation(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quotations'] });
      },
      onError: (error) => {
        console.error('Failed to create quotation:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useUpdateQuotation = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: any }) =>
        quotationService.updateQuotation(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quotations'] });
      },
      onError: (error) => {
        console.error('Failed to update quotation:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useDownloadQuotation = () =>
    useMutation({
      mutationFn: async (id: string | number) => {
        const blob = await quotationService.downloadQuotationPDF(id);
        downloadFile(blob, `quotation_${id}.pdf`);
        return blob;
      },
      onError: (error) => {
        console.error('Failed to download quotation:', error);
        throw new Error(handleApiError(error));
      },
    });

  return {
    useGetQuotations,
    useCreateQuotation,
    useUpdateQuotation,
    useDownloadQuotation,
  };
};

// Client-specific hooks
export const useClients = () => {
  const queryClient = useQueryClient();

  const useSearchClients = (searchTerm: string, enabled: boolean = true) =>
    useQuery({
      queryKey: ['clients', 'search', searchTerm],
      queryFn: () => clientService.searchClients(searchTerm),
      enabled: enabled && !!searchTerm && searchTerm.length > 2,
      staleTime: 60000, // 1 minute
    });

  const useGetClients = (params?: any) =>
    useQuery({
      queryKey: getQueryKey('clients', params),
      queryFn: () => clientService.getClients(params),
      staleTime: 5 * 60 * 1000,
    });

  const useCreateClient = () =>
    useMutation({
      mutationFn: (data: any) => clientService.createClient(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      },
      onError: (error) => {
        console.error('Failed to create client:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useUpdateClient = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: any }) =>
        clientService.updateClient(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      },
      onError: (error) => {
        console.error('Failed to update client:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useDeleteClient = () =>
    useMutation({
      mutationFn: (id: string | number) => clientService.deleteClient(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      },
      onError: (error) => {
        console.error('Failed to delete client:', error);
        throw new Error(handleApiError(error));
      },
    });

  return {
    useSearchClients,
    useGetClients,
    useCreateClient,
    useUpdateClient,
    useDeleteClient,
  };
};

// Vehicle-specific hooks
export const useVehicles = () => {
  const queryClient = useQueryClient();

  const useSearchVehicles = (searchTerm: string, clientId?: number, enabled: boolean = true) =>
    useQuery({
      queryKey: ['vehicles', 'search', searchTerm, clientId],
      queryFn: () => vehicleService.searchVehicles(searchTerm, clientId),
      enabled: enabled && !!searchTerm && searchTerm.length > 2,
      staleTime: 60000,
    });

  const useGetVehicles = (params?: any) =>
    useQuery({
      queryKey: getQueryKey('vehicles', params),
      queryFn: () => vehicleService.getVehicles(params),
      staleTime: 5 * 60 * 1000,
    });

  const useCreateVehicle = () =>
    useMutation({
      mutationFn: (data: any) => vehicleService.createVehicle(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      },
      onError: (error) => {
        console.error('Failed to create vehicle:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useUpdateVehicle = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string | number; data: any }) =>
        vehicleService.updateVehicle(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      },
      onError: (error) => {
        console.error('Failed to update vehicle:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useDeleteVehicle = () =>
    useMutation({
      mutationFn: (id: string | number) => vehicleService.deleteVehicle(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      },
      onError: (error) => {
        console.error('Failed to delete vehicle:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useGetBrands = () =>
    useQuery({
      queryKey: ['vehicle-brands'],
      queryFn: () => vehicleService.getBrands(),
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
    });

  const useGetModels = (brandId: number, enabled: boolean = true) =>
    useQuery({
      queryKey: ['vehicle-models', brandId],
      queryFn: () => vehicleService.getModels(brandId),
      enabled: enabled && !!brandId,
      staleTime: 24 * 60 * 60 * 1000,
    });

  return {
    useSearchVehicles,
    useGetVehicles,
    useCreateVehicle,
    useUpdateVehicle,
    useDeleteVehicle,
    useGetBrands,
    useGetModels,
  };
};

// Dashboard hooks
export const useDashboard = () => {
  const useGetStats = () =>
    useQuery({
      queryKey: ['dashboard', 'stats'],
      queryFn: () => dashboardService.getStats(),
      staleTime: 60000, // 1 minute
      refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    });

  const useGetRecentActivity = () =>
    useQuery({
      queryKey: ['dashboard', 'recent-activity'],
      queryFn: () => dashboardService.getRecentActivity(),
      staleTime: 30000,
    });

  const useGetRevenueData = (period: string = 'month') =>
    useQuery({
      queryKey: ['dashboard', 'revenue', period],
      queryFn: () => dashboardService.getRevenueData(period),
      staleTime: 2 * 60 * 1000,
    });

  return {
    useGetStats,
    useGetRecentActivity,
    useGetRevenueData,
  };
};

// Authentication hooks
export const useAuth = () => {
  const queryClient = useQueryClient();

  const useLogin = () =>
    useMutation({
      mutationFn: (credentials: { username: string; password: string }) =>
        apiService.login(credentials),
      onSuccess: (data) => {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        queryClient.clear(); // Clear all cached data on login
      },
      onError: (error) => {
        console.error('Login failed:', error);
        throw new Error(handleApiError(error));
      },
    });

  const useProfile = (enabled: boolean = true) =>
    useQuery({
      queryKey: ['auth', 'profile'],
      queryFn: () => apiService.getProfile(),
      enabled: enabled && !!localStorage.getItem('token'),
      staleTime: 10 * 60 * 1000,
      retry: false,
    });

  const useLogout = () =>
    useMutation({
      mutationFn: async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        queryClient.clear();
      },
      onSuccess: () => {
        window.location.href = '/login';
      },
    });

  return {
    useLogin,
    useProfile,
    useLogout,
  };
};

// Utility hook for file operations
export const useFileOperations = () => {
  const useUpload = () =>
    useMutation({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        // Implement file upload logic
        return file;
      },
      onError: (error) => {
        console.error('File upload failed:', error);
        throw new Error(handleApiError(error));
      },
    });

  return {
    useUpload,
  };
};

// Real-time updates hook (for future WebSocket integration)
export const useRealTimeUpdates = (endpoint: string) => {
  const queryClient = useQueryClient();

  // This can be extended to use WebSockets for real-time updates
  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: [endpoint] });
  };

  return {
    invalidateData,
  };
};

export default {
  useCrud,
  useInvoices,
  useQuotations,
  useClients,
  useVehicles,
  useDashboard,
  useAuth,
  useFileOperations,
  useRealTimeUpdates,
};