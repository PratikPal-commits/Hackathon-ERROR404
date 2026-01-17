'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: 'green' | 'amber' | 'red' | 'purple' | 'sky' | 'default';
  icon: LucideIcon;
  iconColor?: 'red' | 'blue' | 'green' | 'purple' | 'amber' | 'sky';
  className?: string;
}

const iconColorClasses = {
  red: 'bg-red-100 text-red-600',
  blue: 'bg-sky-100 text-sky-600',
  green: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
  sky: 'bg-sky-100 text-sky-600',
};

const subtitleColorClasses = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  sky: 'text-sky-600',
  default: 'text-slate-500',
};

export function StatCard({
  title,
  value,
  subtitle,
  subtitleColor = 'default',
  icon: Icon,
  iconColor = 'sky',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow', className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
            {subtitle && (
              <p className={cn('text-xs mt-1', subtitleColorClasses[subtitleColor])}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconColorClasses[iconColor])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
