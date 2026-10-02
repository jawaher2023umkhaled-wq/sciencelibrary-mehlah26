import React, { useState } from 'react';
import { ResourceItem } from '../types';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  ShieldCheck,
  Download,
  Share2,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';

interface ResourceSandboxModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResourceSandboxModal: React.FC<ResourceSandboxModalProps> = ({
  resource,
  isOpen,
  onClose
}) => {
  const { downloadResource, showToast } = useResources();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen || !resource) return null;

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('تم نسخ رابط المورد إلى الحافظة', 'info');
    }
  };

  // Prepare secure content for sandboxed iframe
  const srcDoc = resource.htmlContent || `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Cairo', system-ui, sans-serif; background: #f8fafc; color: #334155; padding: 40px; text-align: center; }
  .box { background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  h3 { color: #0284c7; margin-bottom: 8px; }
  p { font-size: 14px; line-height: 1.6; color: #64748b; }
</style>
</head>
<body>
  <div class="box">
    <h3>${resource.title}</h3>
    <p>نوع المورد: ${resource.resourceType} - ${resource.gradeName} (${resource.subjectName})</p>
    <p style="margin-top: 12px;">هذا المورد متاح للمعاينة والتنزيل المباشر.</p>
  </div>
</body>
</html>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div
        className={`bg-slate-900 text-white overflow-hidden shadow-2xl flex flex-col border border-slate-700 transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full h-full sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl'
        }`}
      >
        {/* Sandbox Top Bar */}
        <div className="px-3 sm:px-5 py-3 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
          
          {/* Back Button & Resource Title */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            <button
              onClick={onClose}
              title="العودة"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">العودة</span>
            </button>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>

            <div className="truncate">
              <h3 className="text-xs sm:text-base font-bold text-white truncate">
                {resource.title}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
                <span className="text-cyan-400 font-semibold">{resource.gradeName}</span>
                <span>•</span>
                <span>{resource.subjectName}</span>
                <span>•</span>
                <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                  {resource.resourceType}
                </span>
              </div>
            </div>
          </div>

          {/* Sandbox Security Guard Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بيئة تشغيل تفاعلية معزولة وآمنة (Sandboxed)</span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleReload}
              title="إعادة تشغيل المحاكاة"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {resource.allowDownload !== false && (
              <button
                onClick={() => downloadResource(resource)}
                title="تحميل المورد"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleShare}
              title="مشاركة الرابط"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              title="إغلاق"
              className="p-2 rounded-xl bg-rose-900/60 hover:bg-rose-700 text-rose-200 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sandboxed Iframe Container */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden">
          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-300">جارٍ تشغيل المحاكاة التفاعلية...</p>
            </div>
          )}

          <iframe
            key={iframeKey}
            srcDoc={srcDoc}
            title={resource.title}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-none bg-slate-950"
            // CRITICAL SECURITY REQUIREMENT:
            // Allow scripts to run the educational simulation, but NO allow-same-origin,
            // preventing access to parent cookies, platform credentials, or Firebase tokens.
            sandbox="allow-scripts"
          />
        </div>

        {/* Sandbox Bottom Safety Notice */}
        <div className="px-4 py-2 bg-slate-950 text-slate-400 text-xs flex items-center justify-between border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-[11px] sm:text-xs truncate">
              مدرسة محلاح للبنات (5–12) - نظام المعاينة الآمن للموارد الرقمية
            </span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline whitespace-nowrap">
            تصميم: جواهر المعمرية
          </span>
        </div>
      </div>
    </div>
  );
};
