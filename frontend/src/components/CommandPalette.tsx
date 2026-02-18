import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Car,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Plus,
  Command,
  X
} from 'lucide-react';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  action: () => void;
  category: 'navigation' | 'create' | 'search';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateInvoice: () => void;
  onCreateQuotation: () => void;
  onCreateClient: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onCreateInvoice,
  onCreateQuotation,
  onCreateClient
}: CommandPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', title: 'Dashboard', icon: BarChart3, action: () => navigate('/dashboard'), category: 'navigation' },
    { id: 'nav-clients', title: 'Clients', icon: Users, action: () => navigate('/clients'), category: 'navigation' },
    { id: 'nav-vehicles', title: 'Vehicles', icon: Car, action: () => navigate('/vehicles'), category: 'navigation' },
    { id: 'nav-invoices', title: 'Invoices', icon: Receipt, action: () => navigate('/invoices'), category: 'navigation' },
    { id: 'nav-quotations', title: 'Quotations', icon: FileText, action: () => navigate('/quotations'), category: 'navigation' },
    { id: 'nav-reports', title: 'Reports', icon: BarChart3, action: () => navigate('/reports'), category: 'navigation' },
    { id: 'nav-settings', title: 'Settings', icon: Settings, action: () => navigate('/settings'), category: 'navigation' },

    // Create actions
    { id: 'create-invoice', title: 'Create Invoice', subtitle: 'Generate a new invoice', icon: Plus, action: onCreateInvoice, category: 'create' },
    { id: 'create-quotation', title: 'Create Quotation', subtitle: 'Generate a new quotation', icon: Plus, action: onCreateQuotation, category: 'create' },
    { id: 'create-client', title: 'Add Client', subtitle: 'Add a new client', icon: Plus, action: onCreateClient, category: 'create' },
  ];

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    command.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) groups[category] = [];
    groups[category].push(command);
    return groups;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? filteredCommands.length - 1 : prev - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  const categoryLabels = {
    navigation: 'Navigation',
    create: 'Create',
    search: 'Search'
  };

  let commandIndex = 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Commands */}
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category} className="p-2">
                <h3 className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                {categoryCommands.map((command) => {
                  const isSelected = commandIndex === selectedIndex;
                  commandIndex++;
                  const Icon = command.icon;

                  return (
                    <button
                      key={command.id}
                      onClick={() => {
                        command.action();
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {command.subtitle}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}