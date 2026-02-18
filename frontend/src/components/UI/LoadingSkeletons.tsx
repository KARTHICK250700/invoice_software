import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export function Skeleton({
  className = "",
  width = "w-full",
  height = "h-4",
  rounded = true
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        animate-pulse
        ${rounded ? 'rounded' : ''}
        ${width}
        ${height}
        ${className}
      `}
    />
  );
}

// Card Skeleton
interface CardSkeletonProps {
  count?: number;
  showHeader?: boolean;
  showActions?: boolean;
}

export function CardSkeleton({
  count = 1,
  showHeader = true,
  showActions = true
}: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          {showHeader && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton width="w-10" height="h-10" />
                <div>
                  <Skeleton width="w-24" height="h-5" className="mb-2" />
                  <Skeleton width="w-16" height="h-3" />
                </div>
              </div>
              <Skeleton width="w-8" height="h-8" />
            </div>
          )}

          <div className="space-y-3">
            <Skeleton height="h-4" />
            <Skeleton width="w-3/4" height="h-4" />
            <Skeleton width="w-1/2" height="h-4" />
          </div>

          {showActions && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Skeleton width="w-16" height="h-8" />
              <Skeleton width="w-20" height="h-8" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// Table Skeleton
interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

export function TableSkeleton({
  columns = 4,
  rows = 5,
  showHeader = true
}: TableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={index}
                width="w-20"
                height="h-4"
                className="flex-1"
              />
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex items-center gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  width="w-16"
                  height="h-4"
                  className="flex-1"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Skeleton
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton width="w-20" height="h-4" className="mb-2" />
              <Skeleton width="w-16" height="h-8" className="mb-2" />
              <Skeleton width="w-12" height="h-3" />
            </div>
            <Skeleton width="w-12" height="h-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <Skeleton width="w-48" height="h-8" className="mb-2" />
          <Skeleton width="w-64" height="h-5" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width="w-24" height="h-10" />
          <Skeleton width="w-32" height="h-10" />
        </div>
      </div>
      <div className="mt-6">
        <StatsSkeleton />
      </div>
    </div>
  );
}

// Loading State Component
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = "Loading...",
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin ${sizeClasses[size]}`} />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
}