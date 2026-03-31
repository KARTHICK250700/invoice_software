from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class InvoiceServiceBase(BaseModel):
    service_id: Optional[int] = None
    service_name: str
    amount: float
    hsn_sac_code: Optional[str] = "9986"
    quantity: float = 1.0
    unit_price: float
    total_price: float

class InvoiceServiceCreate(InvoiceServiceBase):
    pass

class InvoiceService(InvoiceServiceBase):
    id: int
    invoice_id: int

    model_config = {"from_attributes": True}

class InvoicePartBase(BaseModel):
    part_id: Optional[int] = None
    part_name: str
    cost: float
    hsn_sac_code: Optional[str] = "8708"
    quantity: int
    unit_price: float
    total_price: float

class InvoicePartCreate(InvoicePartBase):
    pass

class InvoicePart(InvoicePartBase):
    id: int
    invoice_id: int

    model_config = {"from_attributes": True}

class InvoiceBase(BaseModel):
    invoice_number: str
    client_id: int
    vehicle_id: int
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    payment_status: Optional[str] = "pending"
    service_type: Optional[str] = None
    km_reading_in: Optional[int] = None
    km_reading_out: Optional[int] = None
    subtotal: Optional[float] = 0.0
    gst_enabled: Optional[bool] = True
    tax_rate: Optional[float] = 18.0
    cgst_rate: Optional[float] = 9.0
    sgst_rate: Optional[float] = 9.0
    igst_rate: Optional[float] = 18.0
    tax_amount: Optional[float] = 0.0
    cgst_amount: Optional[float] = 0.0
    sgst_amount: Optional[float] = 0.0
    igst_amount: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    total_amount: Optional[float] = 0.0
    paid_amount: Optional[float] = 0.0
    balance_due: Optional[float] = 0.0
    round_off: Optional[float] = 0.0
    technician_name: Optional[str] = None
    work_order_no: Optional[str] = None
    payment_method: Optional[str] = "Cash"
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    services: Optional[List[InvoiceServiceCreate]] = []
    parts: Optional[List[InvoicePartCreate]] = []

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    payment_status: Optional[str] = None
    service_type: Optional[str] = None
    km_reading_out: Optional[int] = None
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class Invoice(InvoiceBase):
    id: int
    created_at: datetime
    services: List[InvoiceService] = []
    parts: List[InvoicePart] = []

    model_config = {"from_attributes": True}

class InvoiceWithDetails(Invoice):
    client: Optional["Client"] = None
    vehicle: Optional["Vehicle"] = None

    model_config = {"from_attributes": True}