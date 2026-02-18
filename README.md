# 🚗 Car Service Center Invoice & Billing Software

A professional car service center management system with invoice generation and billing capabilities. Built with modern technologies and featuring a beautiful purple-themed interface.

## ✨ Features

### 🏢 Core Functionality
- **Client Management** - Complete customer database with contact details
- **Vehicle Database** - 1000+ vehicle models from major brands
- **Service Management** - 1000+ predefined services with pricing
- **Spare Parts Inventory** - 5000+ automotive parts catalog
- **Invoice Generation** - Professional invoices with GST calculations
- **Dashboard Analytics** - Revenue tracking and business insights
- **Authentication System** - Secure login with JWT tokens

### 🎨 Design & UX
- **Purple Theme** - Professional gradient design
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, intuitive interface with Tailwind CSS
- **Professional Branding** - Custom logo integration
- **Real-time Search** - Quick filtering across all modules

### 🔧 Technical Features
- **SQLite Database** - Lightweight, embedded database
- **RESTful API** - FastAPI backend with automatic documentation
- **TypeScript** - Type-safe frontend development
- **React Query** - Efficient data fetching and caching
- **Auto-complete** - Smart suggestions for services and parts

## 🔐 Default Admin Credentials
- **Username**: `admin`
- **Password**: `Avan@123`

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern JavaScript library
- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Lucide React** - Beautiful icons
- **Recharts** - Data visualization

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Python SQL toolkit and ORM
- **SQLite** - Embedded database
- **JWT Authentication** - Secure token-based auth
- **Pydantic** - Data validation using Python type hints
- **Uvicorn** - ASGI server for production

## 📁 Project Structure
```
car-service-center/
├── 📁 frontend/              # React Vite application
│   ├── 📁 src/
│   │   ├── 📁 components/    # Reusable UI components
│   │   ├── 📁 pages/         # Application pages
│   │   ├── 📁 context/       # React context providers
│   │   ├── 📁 services/      # API service functions
│   │   └── 📁 types/         # TypeScript type definitions
│   ├── 📁 public/            # Static assets
│   └── package.json
├── 📁 backend/               # FastAPI application
│   ├── 📁 models/            # Database models
│   ├── 📁 routers/           # API route handlers
│   ├── 📁 auth/              # Authentication logic
│   ├── 📁 database/          # Database configuration
│   ├── 📁 utils/             # Utility functions
│   └── requirements.txt
├── 📁 database/              # SQLite database files
├── logo-om-murugan.png      # Company logo
├── start-all.bat            # Windows startup script
├── start-backend.bat        # Backend only startup
├── start-frontend.bat       # Frontend only startup
└── README.md
```

## 🚀 Quick Start

### Method 1: Automatic Startup (Windows)
Simply double-click `start-all.bat` to launch both frontend and backend automatically.

### Method 2: Manual Setup

#### Prerequisites
- **Python 3.8+** (Download from [python.org](https://python.org))
- **Node.js 16+** (Download from [nodejs.org](https://nodejs.org))
- **Git** (Optional, for version control)

#### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload

# Backend will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

#### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev

# Frontend will be available at http://localhost:5173
```

## 🎯 Using the Application

### 1. **Login**
- Open http://localhost:5173 in your browser
- Use default credentials: `admin` / `Avan@123`
- The system will redirect you to the dashboard

### 2. **Dashboard**
- View key business metrics and analytics
- Monitor revenue trends and service distribution
- Access recent invoices and quick actions

### 3. **Client Management**
- Add new clients with complete contact information
- Search and filter existing clients
- Track client history and outstanding balances

### 4. **Vehicle Management**
- Register vehicles with brand, model, and specifications
- Link vehicles to clients
- Track service history and mileage

### 5. **Invoice Creation**
- Create professional invoices with services and parts
- Automatic tax calculations (18% GST default)
- Generate PDF invoices for printing

### 6. **Settings**
- Configure company information
- Customize appearance and theme
- Manage user preferences and security

## 🎨 Customization

### Logo Integration
Your logo (`logo-om-murugan.png`) is already integrated into:
- Login page header
- Dashboard sidebar
- Invoice templates
- Company branding

### Color Scheme
The application uses a professional purple theme:
- **Primary**: Purple gradient (#8B5CF6 to #9333EA)
- **Accent**: Light purple variations
- **UI**: Gray scale for text and backgrounds

### Database Content
The system comes pre-loaded with:
- **50+ Vehicle Brands** (Maruti, Hyundai, Tata, Honda, Toyota, etc.)
- **1000+ Vehicle Models** (covering 1990-2025)
- **1000+ Services** (Engine, Brake, AC, Electrical, etc.)
- **5000+ Spare Parts** (organized by categories)

## 📊 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation with:
- All available endpoints
- Request/response schemas
- Authentication requirements
- Try-it-out functionality

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt encryption for user passwords
- **CORS Configuration** - Proper cross-origin request handling
- **Input Validation** - Pydantic models for data validation
- **SQL Injection Protection** - SQLAlchemy ORM prevents SQL injection

## 🌟 Trial Version

This is a **fully functional trial version** that includes:
- ✅ All core features enabled
- ✅ Complete database with sample data
- ✅ Professional UI with purple theme
- ✅ Full API access
- ✅ No time limitations
- ✅ Export functionality
- ✅ Multi-user support (admin interface)

## 📞 Support

For technical support or licensing inquiries:
- **Email**: Contact your software provider
- **GitHub Issues**: Report bugs or feature requests
- **Documentation**: Full API docs at `/docs` endpoint

## 📜 License

© 2024 Om Murugan Car Service Center - Trial Version
All Rights Reserved

---

**Made with ❤️ using modern web technologies**