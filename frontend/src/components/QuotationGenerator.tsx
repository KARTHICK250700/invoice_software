import React, { useState } from 'react';
// Old PDF generator import removed

interface QuotationGeneratorProps {
  quotationData?: any; // Replace with your actual backend data type
}

const QuotationGenerator: React.FC<QuotationGeneratorProps> = ({ quotationData }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample data structure - replace with your backend data
  const sampleQuotationData = {
    quotationNumber: "QUO-2024-001",
    quotationDate: new Date().toISOString(),
    clientName: "John Doe",
    clientPhone: "+91 98765 43210",
    clientEmail: "john.doe@email.com",
    clientAddress: "123 Customer Street, City - 600001",
    vehicleNumber: "TN 01 AB 1234",
    vehicleMake: "Honda",
    vehicleModel: "City",
    vehicleYear: "2020",
    mileage: "45,000 km",
    services: [
      {
        id: "1",
        name: "Engine Oil Change",
        description: "Full synthetic engine oil replacement",
        price: 2500,
        quantity: 1
      },
      {
        id: "2",
        name: "Brake Inspection",
        description: "Complete brake system check",
        price: 800,
        quantity: 1
      },
      {
        id: "3",
        name: "AC Service",
        description: "Air conditioning cleaning and gas refill",
        price: 1500,
        quantity: 1
      }
    ],
    parts: [
      {
        id: "1",
        name: "Engine Oil Filter",
        partNumber: "HON-15400-RTA-003",
        quantity: 1,
        unitPrice: 450,
        total: 450
      },
      {
        id: "2",
        name: "Brake Pads (Front)",
        partNumber: "HON-45022-S7A-000",
        quantity: 1,
        unitPrice: 3200,
        total: 3200
      },
      {
        id: "3",
        name: "AC Filter",
        partNumber: "HON-80292-TF0-G01",
        quantity: 1,
        unitPrice: 650,
        total: 650
      }
    ],
    subtotal: 9100,
    tax: 1638, // 18% GST
    discount: 0,
    total: 10738
  };

  const handleGenerateQuotation = async () => {
    setIsGenerating(true);
    try {
      // Use provided data or sample data
      const dataToUse = quotationData || sampleQuotationData;

      // Transform your backend data to match the interface if needed
      const transformedData = transformBackendData(dataToUse);

      await generateProfessionalQuotationPDF(transformedData);
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Error generating quotation PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Transform your backend data to match the required interface
  const transformBackendData = (backendData: any) => {
    // Adjust this function based on your actual backend data structure
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
        name: service.name || service.service_name,
        description: service.description,
        price: service.price || service.amount,
        quantity: service.quantity || 1
      })),
      parts: (backendData.parts || []).map((part: any) => ({
        id: part.id,
        name: part.name || part.part_name,
        partNumber: part.part_number || part.partNumber,
        quantity: part.quantity,
        unitPrice: part.unit_price || part.unitPrice,
        total: part.total || (part.quantity * (part.unit_price || part.unitPrice))
      })),
      subtotal: backendData.subtotal,
      tax: backendData.tax || backendData.tax_amount,
      discount: backendData.discount || 0,
      total: backendData.total || backendData.total_amount
    };
  };

  return (
    <div className="quotation-generator">
      <button
        onClick={handleGenerateQuotation}
        disabled={isGenerating}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded transition-colors"
      >
        {isGenerating ? 'Generating PDF...' : 'Generate Professional Quotation'}
      </button>

      {isGenerating && (
        <div className="mt-2 text-sm text-gray-600">
          Creating professional quotation PDF with logo and styling...
        </div>
      )}
    </div>
  );
};

export default QuotationGenerator;