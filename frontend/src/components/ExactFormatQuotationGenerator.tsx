import React, { useState } from 'react';
// Old PDF generator import removed

const ExactFormatQuotationGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample data matching your exact invoice format
  const exactFormatData = {
    quotationNumber: "QUO000001",
    quotationDate: "2024-12-09",
    dueDate: "2024-12-16",
    clientName: "Karthick",
    clientAddress: "141, Worth Street",
    clientPhone: "63B2651412",
    vehicleNumber: "TNOI AB134",
    vehicleMake: "BMW",
    vehicleModel: "",
    vehicleYear: "2025",
    vin: "324ABBA7880812B",
    placeOfSupply: "Tamil Nadu (55) (TG)",
    transportMode: "Self Transport ID",
    items: [
      {
        id: "1",
        description: "Car Service Package",
        hsnSac: "",
        quantity: 1,
        rate: 0.00,
        amount: 0.00,
        total: 0.00
      }
    ],
    taxableAmount: 0.00,
    cgstRate: 6,
    cgstAmount: 0.00,
    sgstRate: 9,
    sgstAmount: 0.00,
    totalTax: 0.00,
    grandTotal: 0.00
  };

  const companyInfo = {
    name: "OM MURUGAN AUTO WORKS",
    tagline: "Manufacturing & Supply of Precision Auto Care Services",
    address: "Plot No A 54, Road No 27, Wagle Indl Estate, Mumbai, Maharadhra - 408604",
    phone: "929+551650",
    email: "ommurugan@",
    pan: "26CCRPP3935NT",
    website: "www.ommuruganiautoworks.com",
    gstin: "32V*NEL000002/3"
  };

  const handleGenerateExactQuotation = async () => {
    setIsGenerating(true);
    try {
      alert("Use PDFQuotation component instead");
    } catch (error) {
      console.error('Error generating exact format quotation:', error);
      alert('Error generating quotation PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="exact-format-quotation-generator p-6">
      <h2 className="text-xl font-bold mb-4">🎯 Exact Format Quotation Generator</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-bold text-blue-800 mb-2">✨ Exact Invoice Format Features:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>✅ Blue header sections (CLIENT/VEHICLE DETAILS)</div>
          <div>✅ Professional table with HSN/SAC column</div>
          <div>✅ Green QUOTATION TOTAL section</div>
          <div>✅ QR code placeholder</div>
          <div>✅ Terms & conditions</div>
          <div>✅ Authorized signature line</div>
          <div>✅ Compact layout (no extra spacing)</div>
          <div>✅ Exact company branding</div>
        </div>
      </div>

      <button
        onClick={handleGenerateExactQuotation}
        disabled={isGenerating}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
      >
        {isGenerating ? 'Generating Exact Format PDF...' : 'Generate Exact Format Quotation'}
      </button>

      {isGenerating && (
        <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Creating quotation with exact invoice format...</span>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">📋 Sample Data Structure:</h3>
        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
{`{
  quotationNumber: "QUO000001",
  quotationDate: "2024-12-09",
  clientName: "Karthick",
  clientAddress: "141, Worth Street",
  clientPhone: "63B2651412",
  vehicleNumber: "TNOI AB134",
  vehicleMake: "BMW",
  vehicleYear: "2025",
  items: [{
    description: "Car Service Package",
    hsnSac: "",
    quantity: 1,
    rate: 0.00,
    amount: 0.00,
    total: 0.00
  }],
  taxableAmount: 0.00,
  cgstRate: 6,
  sgstRate: 9,
  grandTotal: 0.00
}`}
        </pre>
      </div>
    </div>
  );
};

export default ExactFormatQuotationGenerator;