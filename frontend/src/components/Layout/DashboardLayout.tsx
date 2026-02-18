import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Car,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  User,
  ChevronDown,
  Sun,
  Moon,
  Command,
  HelpCircle,
  BarChart3,
  Download,
  Zap,
  ChevronRight
} from 'lucide-react';
import Breadcrumb from '../Breadcrumb';
import CommandPalette from '../CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Live data counts (you can fetch these from your API)
  const [liveCounts, setLiveCounts] = useState({
    clients: 3,
    vehicles: 0,
    invoices: 9,
    quotations: 2,
    pendingReports: 1
  });

  // Organized navigation sections
  const navigationSections = [
    {
      title: '',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          shortcut: '⌘1',
          isSpecial: true
        },
      ]
    },
    {
      title: 'WORKSPACE',
      items: [
        {
          name: 'Clients',
          href: '/clients',
          icon: Users,
          badge: liveCounts.clients,
          shortcut: '⌘2',
          color: 'blue'
        },
        {
          name: 'Vehicles',
          href: '/vehicles',
          icon: Car,
          badge: liveCounts.vehicles,
          shortcut: '⌘3',
          color: 'green'
        },
        {
          name: 'Invoices',
          href: '/invoices',
          icon: Receipt,
          badge: liveCounts.invoices,
          shortcut: '⌘4',
          color: 'purple'
        },
      ]
    },
    {
      title: 'BUSINESS',
      items: [
        {
          name: 'Quotations',
          href: '/quotations',
          icon: FileText,
          badge: liveCounts.quotations,
          shortcut: '⌘5',
          color: 'orange'
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: BarChart3,
          badge: liveCounts.pendingReports,
          shortcut: '⌘6',
          color: 'indigo',
          isNew: true
        },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        {
          name: 'Settings',
          href: '/settings',
          icon: Settings,
          shortcut: '⌘,',
          color: 'gray'
        },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [],
    () => setCommandPaletteOpen(true),
    () => {}, // onCreateInvoice - will be passed from parent
    () => {}, // onCreateQuotation - will be passed from parent
    () => {}  // onCreateClient - will be passed from parent
  );

  return (
    <div className="min-h-screen dark-bg">
      {/* Modern Figma-Style Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>

        {/* Header Section */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">OM</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invoice Pro</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">OM MURUGAN AUTO</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">⌘K</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto">
          <div className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                {/* Section Title */}
                {section.title && !sidebarCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-3">
                    {section.title}
                  </h3>
                )}

                {/* Navigation Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        } ${item.isSpecial ? 'font-medium' : ''}`}
                        title={sidebarCollapsed ? item.name : ''}
                      >
                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"></div>
                        )}

                        {/* Icon */}
                        <div className={`relative ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                          <Icon className="w-5 h-5" />
                          {item.badge !== undefined && item.badge > 0 && (
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                              {item.badge > 99 ? '99+' : item.badge}
                            </div>
                          )}
                        </div>

                        {/* Label and Badge */}
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 font-medium">{item.name}</span>

                            {/* Badges and Indicators */}
                            <div className="flex items-center gap-2">
                              {item.isNew && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-md font-medium">
                                  New
                                </span>
                              )}

                              {item.badge !== undefined && item.badge > 0 && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg font-medium">
                                  {item.badge}
                                </span>
                              )}

                              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.shortcut}
                              </span>
                            </div>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}>
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center relative">
              <User className="w-5 h-5 text-white" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.full_name || user?.username || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'admin@ommurugan.com'}
                </p>
              </div>
            )}

            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'} transition-all duration-300`}>
        {/* Top Navigation */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search... (or press Ctrl+K)"
                  onClick={() => setCommandPaletteOpen(true)}
                  readOnly
                  className="w-full pl-10 pr-16 py-2 border dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark-card dark-text cursor-pointer"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-100 dark:bg-gray-700 border dark-border rounded text-xs dark-text-muted">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right side items */}
            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg dark-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {/* Keyboard shortcuts help */}
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 rounded-lg dark-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Keyboard shortcuts"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Command palette shortcut */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="p-2 rounded-lg dark-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Command palette (Ctrl+K)"
              >
                <Command className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="p-2 rounded-lg dark-text-muted hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCreateInvoice={() => {}}
        onCreateQuotation={() => {}}
        onCreateClient={() => {}}
      />

      {/* Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="dark-card rounded-xl shadow-2xl border dark-border max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark-text">Keyboard Shortcuts</h2>
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium dark-text mb-2">Navigation</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Dashboard</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + D</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Clients</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + C</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Vehicles</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + V</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Invoices</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + I</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium dark-text mb-2">Actions</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Command Palette</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + K</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="dark-text-muted">New Invoice</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl + Shift + N</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span className="dark-text-muted">Focus Search</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">/</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}