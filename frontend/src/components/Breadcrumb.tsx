import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
}

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  vehicles: 'Vehicles',
  quotations: 'Quotations',
  invoices: 'Invoices',
  reports: 'Reports',
  settings: 'Settings'
};

export default function Breadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: Home }
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    if (segment !== 'dashboard' && index === 0) return;

    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    if (segment !== 'dashboard') {
      breadcrumbItems.push({
        label,
        path: currentPath
      });
    }
  });

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;

        return (
          <React.Fragment key={item.path}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1 text-gray-900 font-medium">
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="flex items-center gap-1 hover:text-primary-600 transition-colors"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}