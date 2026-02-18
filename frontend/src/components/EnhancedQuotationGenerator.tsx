import React, { useState } from 'react';
// Old PDF generator import removed

interface EnhancedQuotationGeneratorProps {
  quotationData?: any;
}

const EnhancedQuotationGenerator: React.FC<EnhancedQuotationGeneratorProps> = ({ quotationData }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample data matching your HTML table format
  const sampleEnhancedData = {
    quotationNumber: "QT-000001",
    quotationDate: "2024-12-09",
    clientName: "Karthick",
    clientPhone: "6382551412",
    clientEmail: "karthick@email.com",
    clientAddress: "123 Customer Address",
    vehicleNumber: "TN 50 AU5590",
    vehicleMake: "BMW",
    vehicleModel: "X5",
    vehicleYear: "2025",
    mileage: "15,000 km",

    // Service/Labor section - matching your HTML table
    services: [
      {
        id: "1",
        jobDescription: "General Service",
        hours: 2.0,
        rate: 75.00,
        amount: 150.00
      },
      {
        id: "2",
        jobDescription: "Engine Check",
        hours: 1.0,
        rate: 50.00,
        amount: 50.00
      },
      {
        id: "3",
        jobDescription: "Brake Cleaning",
        hours: 1.0,
        rate: 40.00,
        amount: 40.00
      }
    ],

    // Parts section - matching your HTML table
    parts: [
      {
        id: "1",
        partNumber: "12345",
        partName: "Oil Filter",
        quantity: 1,
        unitPrice: 34.00,
        amount: 34.00
      },
      {
        id: "2",
        partNumber: "67890",
        partName: "Air Filter",
        quantity: 2,
        unitPrice: 17.55,
        amount: 35.10
      },
      {
        id: "3",
        partNumber: "45678",
        partName: "Brake Pads (Set)",
        quantity: 1,
        unitPrice: 850.00,
        amount: 850.00
      }
    ],

    // Calculations matching your format
    laborSubtotal: 240.00,
    laborTaxRate: 9.5,
    laborTax: 22.80,
    partsSubtotal: 919.10,
    partsTaxRate: 6.5,
    partsTax: 59.74,
    grandTotal: 1241.64 // 240 + 22.80 + 919.10 + 59.74
  };

  const handleGenerateEnhancedQuotation = async () => {
    setIsGenerating(true);
    try {
      const dataToUse = quotationData || sampleEnhancedData;

      // Transform backend data if needed
      const transformedData = transformBackendToEnhancedFormat(dataToUse);

      alert("Use PDFQuotation component instead");
    } catch (error) {
      console.error('Error generating enhanced quotation:', error);
      alert('Error generating enhanced quotation PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Transform your backend data to match the enhanced format
  const transformBackendToEnhancedFormat = (backendData: any) => {
    // Calculate labor subtotal and tax
    const laborSubtotal = (backendData.services || []).reduce((sum: number, service: any) =>
      sum + (service.amount || (service.hours * service.rate)), 0
    );
    const laborTaxRate = 9.5; // You can make this configurable
    const laborTax = laborSubtotal * (laborTaxRate / 100);

    // Calculate parts subtotal and tax
    const partsSubtotal = (backendData.parts || []).reduce((sum: number, part: any) =>
      sum + (part.amount || (part.quantity * part.unitPrice)), 0
    );
    const partsTaxRate = 6.5; // You can make this configurable
    const partsTax = partsSubtotal * (partsTaxRate / 100);

    const grandTotal = laborSubtotal + laborTax + partsSubtotal + partsTax;

    return {
      quotationNumber: backendData.quotation_number || backendData.quotationNumber,
      quotationDate: backendData.quotation_date || backendData.quotationDate,
      clientName: backendData.client_name || backendData.clientName,
      clientPhone: backendData.client_phone || backendData.clientPhone,
      clientEmail: backendData.client_email || backendData.clientEmail,
      clientAddress: backendData.client_address || backendData.clientAddress,
      vehicleNumber: backendData.vehicle_number || backendData.vehicleNumber,
      vehicleMake: backendData.vehicle_make || backendData.vehicleMake,
      vehicleModel: backendData.vehicle_model || backendData.vehicleModel,
      vehicleYear: backendData.vehicle_year || backendData.vehicleYear,
      mileage: backendData.mileage,

      services: (backendData.services || []).map((service: any) => ({
        id: service.id,
        jobDescription: service.job_description || service.name || service.description,
        hours: service.hours || 1.0,
        rate: service.rate || service.price || 0,
        amount: service.amount || (service.hours * service.rate) || service.price || 0
      })),

      parts: (backendData.parts || []).map((part: any) => ({
        id: part.id,
        partNumber: part.part_number || part.partNumber || 'N/A',
        partName: part.part_name || part.name,
        quantity: part.quantity,
        unitPrice: part.unit_price || part.unitPrice,
        amount: part.amount || (part.quantity * part.unitPrice)
      })),

      laborSubtotal,
      laborTaxRate,
      laborTax,
      partsSubtotal,
      partsTaxRate,
      partsTax,
      grandTotal
    };
  };

  return (
    <div className="enhanced-quotation-generator">
      <button
        onClick={handleGenerateEnhancedQuotation}
        disabled={isGenerating}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
      >
        {isGenerating ? 'Generating Enhanced PDF...' : 'Generate Professional Enhanced Quotation'}
      </button>

      {isGenerating && (
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Creating professional quotation with separate labor and parts tables...</span>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold text-lg mb-2">✨ Enhanced Features:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Professional table format matching your HTML design</li>
          <li>✅ Separate Labor table (Job Description, Hours, Rate, Amount)</li>
          <li>✅ Separate Parts table (Part #, Part Name, Qty, Unit Price, Amount)</li>
          <li>✅ Individual subtotals and tax calculations for each section</li>
          <li>✅ Professional gray headers (#f0f0f0)</li>
          <li>✅ Proper table borders and formatting</li>
          <li>✅ Company logo support</li>
          <li>✅ Grand total with professional styling</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedQuotationGenerator;