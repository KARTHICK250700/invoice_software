import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  stats,
  className = ""
}: PageHeaderProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="px-4 lg:px-6 py-4">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link to="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <ChevronRight className="w-4 h-4" />
                {item.href ? (
                  <Link
                    to={item.href}
                    className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title Section */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          {actions && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="mt-4">
            {stats}
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Stats Component for page headers
interface QuickStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    icon?: React.ComponentType<{ className?: string }>;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }>;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const getColorClasses = (color: string = 'blue', trendDirection?: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200'
    };

    const trendColorMap = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500'
    };

    return {
      card: colorMap[color as keyof typeof colorMap] || colorMap.blue,
      trend: trendDirection ? trendColorMap[trendDirection as keyof typeof trendColorMap] : 'text-gray-500'
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const colors = getColorClasses(stat.color, stat.trendDirection);
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${colors.card}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.trend && (
                  <p className={`text-sm font-medium ${colors.trend}`}>
                    {stat.trend}
                  </p>
                )}
              </div>
              {Icon && (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/50">
                  <Icon className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}