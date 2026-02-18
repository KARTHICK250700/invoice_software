import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutAction[] = [],
  onCommandPalette?: () => void,
  onCreateInvoice?: () => void,
  onCreateQuotation?: () => void,
  onCreateClient?: () => void
) {
  const navigate = useNavigate();

  const defaultShortcuts: ShortcutAction[] = [
    // Navigation shortcuts
    { key: 'd', ctrl: true, action: () => navigate('/dashboard'), description: 'Go to Dashboard', preventDefault: true },
    { key: 'c', ctrl: true, action: () => navigate('/clients'), description: 'Go to Clients', preventDefault: true },
    { key: 'v', ctrl: true, action: () => navigate('/vehicles'), description: 'Go to Vehicles', preventDefault: true },
    { key: 'i', ctrl: true, action: () => navigate('/invoices'), description: 'Go to Invoices', preventDefault: true },
    { key: 'q', ctrl: true, action: () => navigate('/quotations'), description: 'Go to Quotations', preventDefault: true },
    { key: 'r', ctrl: true, action: () => navigate('/reports'), description: 'Go to Reports', preventDefault: true },
    { key: 's', ctrl: true, action: () => navigate('/settings'), description: 'Go to Settings', preventDefault: true },

    // Command palette
    { key: 'k', ctrl: true, action: () => onCommandPalette?.(), description: 'Open Command Palette', preventDefault: true },

    // Quick actions
    { key: 'n', ctrl: true, shift: true, action: () => onCreateInvoice?.(), description: 'New Invoice', preventDefault: true },
    { key: 'q', ctrl: true, shift: true, action: () => onCreateQuotation?.(), description: 'New Quotation', preventDefault: true },
    { key: 'c', ctrl: true, shift: true, action: () => onCreateClient?.(), description: 'New Client', preventDefault: true },

    // General shortcuts
    { key: 'Escape', action: () => {
      // Close any open modals/dropdowns
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    }, description: 'Close modal/dropdown' },

    { key: '/', action: () => {
      // Focus search input
      const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="search" i], input[type="search"]');
      if (searchInputs.length > 0) {
        (searchInputs[0] as HTMLInputElement).focus();
      }
    }, description: 'Focus search' },
  ];

  const allShortcuts = [...defaultShortcuts, ...shortcuts];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;

    // Skip if user is typing in an input/textarea/contenteditable
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Only allow Escape and Ctrl+K in inputs
      if (event.key !== 'Escape' && !(event.ctrlKey && event.key === 'k')) {
        return;
      }
    }

    for (const shortcut of allShortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [allShortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { shortcuts: allShortcuts };
}

// Hook to get available shortcuts for help display
export function useShortcutHelp() {
  const getShortcutDisplay = (shortcut: ShortcutAction): string => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  const groupedShortcuts = {
    navigation: [
      { key: 'Ctrl + D', description: 'Go to Dashboard' },
      { key: 'Ctrl + C', description: 'Go to Clients' },
      { key: 'Ctrl + V', description: 'Go to Vehicles' },
      { key: 'Ctrl + I', description: 'Go to Invoices' },
      { key: 'Ctrl + Q', description: 'Go to Quotations' },
      { key: 'Ctrl + R', description: 'Go to Reports' },
      { key: 'Ctrl + S', description: 'Go to Settings' },
    ],
    actions: [
      { key: 'Ctrl + K', description: 'Open Command Palette' },
      { key: 'Ctrl + Shift + N', description: 'New Invoice' },
      { key: 'Ctrl + Shift + Q', description: 'New Quotation' },
      { key: 'Ctrl + Shift + C', description: 'New Client' },
    ],
    general: [
      { key: '/', description: 'Focus search' },
      { key: 'Escape', description: 'Close modal/dropdown' },
    ],
  };

  return { groupedShortcuts, getShortcutDisplay };
}