import React from 'react';
import { ResourceItem } from '../types';
import { ResourceCard } from './ResourceCard';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface FeaturedResourcesProps {
  resources: ResourceItem[];
  onOpenDetails: (res: ResourceItem) => void;
  onLaunch: (res: ResourceItem) => void;
  onViewAll: () => void;
}

export const FeaturedResources: React.FC<FeaturedResourcesProps> = ({
  resources,
  onOpenDetails,
  onLaunch,
  onViewAll
}) => {
  // Filter published and pick top 4
  const featured = resources
    .filter(r => r.status === 'published')
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 4);

  return (
    <section className="py-16 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>مختارات تعليمية متميزة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              موارد مميزة
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              أبرز المحاكيات والتجارب والأنشطة الأكثر تفاعلاً وتقييماً في مدرسة محلاح للبنات
            </p>
          </div>

          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>استكشاف كل الموارد في المكتبة</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Resources Grid */}
        {featured.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
            بانتظار إضافة الموارد الأولى عبر لوحة الإدارة ليتم إبرازها هنا تلقائياً في قاعدة البيانات.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onOpenDetails={onOpenDetails}
                onLaunch={onLaunch}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
