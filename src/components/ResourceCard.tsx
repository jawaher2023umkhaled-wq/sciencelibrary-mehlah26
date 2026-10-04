import React from 'react';
import { ResourceItem, isResourceInteractive } from '../types';
import { useResources } from '../context/ResourceContext';
import {
  Star,
  Eye,
  Heart,
  Play,
  FileText,
  User,
  ExternalLink
} from 'lucide-react';

interface ResourceCardProps {
  resource: ResourceItem;
  onOpenDetails?: (resource: ResourceItem) => void;
  onLaunch?: (resource: ResourceItem) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onOpenDetails,
  onLaunch
}) => {
  const { favorites, toggleFavorite, openResource, launchResource } = useResources();
  const isFavorite = favorites.includes(resource.id);

  const handleOpenDetails = () => {
    if (onOpenDetails) {
      onOpenDetails(resource);
    } else {
      openResource(resource);
    }
  };

  const handleLaunch = () => {
    if (onLaunch) {
      onLaunch(resource);
    } else {
      launchResource(resource);
    }
  };

  // Status Badge Helper for non-published items
  const renderStatusBadge = () => {
    switch (resource.status) {
      case 'submitted':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">تم الإرسال للمراجعة</span>;
      case 'under_review':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">قيد المراجعة</span>;
      case 'draft':
        return <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">مسودة</span>;
      case 'needs_revision':
        return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">يحتاج إلى تعديل</span>;
      case 'rejected':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">مرفوض</span>;
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">معتمد</span>;
      default:
        return null;
    }
  };

  const isInteractive = isResourceInteractive(resource);

  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-xl hover:shadow-sky-900/10 transition-all duration-300 flex flex-col justify-between transform hover:-translate-y-1">
      {/* Thumbnail Container */}
      <div className="relative h-44 overflow-hidden bg-slate-100">
        <img
          src={resource.thumbnailUrl}
          alt={resource.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

        {/* Top Floating Badges */}
        <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
          <span className="bg-white/95 backdrop-blur-md text-sky-800 text-xs font-extrabold px-3 py-1 rounded-full shadow-xs">
            {resource.resourceType}
          </span>

          <div className="flex items-center gap-1.5">
            {renderStatusBadge()}
            
            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(resource.id);
              }}
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                  : 'bg-white/90 text-slate-600 hover:text-rose-500 hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Grade & Subject Pill on bottom of thumbnail */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
          <span className="bg-sky-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
            {resource.gradeName}
          </span>
          <span className="bg-cyan-600/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
            {resource.subjectName}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <h3
            onClick={handleOpenDetails}
            className="text-base font-bold text-slate-900 hover:text-sky-600 transition-colors line-clamp-1 mb-1 cursor-pointer"
            title={resource.title}
          >
            {resource.title}
          </h3>

          {/* Unit or Topic Context */}
          <p className="text-[11px] text-sky-700 font-semibold mb-2 truncate flex items-center gap-1 min-h-[1.25rem]">
            {resource.unit || resource.topic ? (
              <span>📖 {resource.unit || resource.topic}</span>
            ) : (
              <span className="text-transparent select-none">•</span>
            )}
          </p>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 min-h-[2.5rem]">
            {resource.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div>
          {/* Author, Rating & Usage */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[100px] font-medium">{resource.authorName}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Rating */}
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{resource.ratingAverage > 0 ? resource.ratingAverage : 'جديد'}</span>
              </div>

              {/* Usage Count */}
              <div className="text-slate-400 flex items-center gap-1 font-medium" title="عدد مرات الاستخدام">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{resource.usageCount}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenDetails}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تفاصيل</span>
            </button>

            {isInteractive ? (
              <button
                onClick={handleLaunch}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-sky-500/20 transition-all cursor-pointer hover:shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>تشغيل</span>
              </button>
            ) : (
              <button
                onClick={handleOpenDetails}
                className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح المورد</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
