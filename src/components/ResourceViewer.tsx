import React, { useState, useEffect, useMemo } from 'react';
import { ResourceItem, isResourceInteractive } from '../types';
import { getSimulationContent, generateInteractiveSimulationShell } from '../data/simulations';
import { ErrorBoundary } from './ErrorBoundary';
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
  ExternalLink,
  Play
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';

export interface ResourceViewerProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ResourceViewer Component
 * Dedicated viewer modal for published resources and interactive HTML simulations.
 * Embeds HTML simulations, Supabase storage files, and interactive packages inside a secure sandboxed iframe.
 */
export const ResourceViewer: React.FC<ResourceViewerProps> = ({
  resource,
  isOpen,
  onClose
}) => {
  const { downloadResource, showToast } = useResources();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);

  // Check if resource is an interactive HTML simulation safely (unconditional Hook call)
  const isInteractive = useMemo(() => Boolean(resource && typeof resource === 'object' && isResourceInteractive(resource)), [resource]);

  // Resolve HTML code from all possible sources (unconditional Hook call):
  // 1. Direct htmlContent or html_content property
  // 2. data:text/html data URL in fileUrl, file_url, or url
  // 3. Raw HTML string inside fileUrl
  // 4. Fetched content from public Supabase Storage URL
  // 5. Intelligent built-in simulation matcher
  useEffect(() => {
    setFetchedHtml(null);
    setIsLoading(true);

    if (!resource || !isOpen || typeof resource !== 'object') {
      setIsLoading(false);
      return;
    }

    // 1. Direct HTML content property
    const directHtml = resource.htmlContent || resource.html_content;
    if (directHtml && typeof directHtml === 'string' && directHtml.trim().length > 0) {
      setFetchedHtml(directHtml);
      setIsLoading(false);
      return;
    }

    const fileUrl = resource.fileUrl || resource.file_url || resource.url || '';

    // 2. Check Data URL (UTF-8 or Base64)
    if (fileUrl.startsWith('data:text/html;charset=utf-8,')) {
      try {
        const decoded = decodeURIComponent(fileUrl.replace('data:text/html;charset=utf-8,', ''));
        setFetchedHtml(decoded);
      } catch {
        setFetchedHtml(fileUrl);
      }
      setIsLoading(false);
      return;
    }

    if (fileUrl.startsWith('data:text/html;base64,')) {
      try {
        const decoded = decodeURIComponent(escape(atob(fileUrl.replace('data:text/html;base64,', ''))));
        setFetchedHtml(decoded);
      } catch {
        try {
          setFetchedHtml(atob(fileUrl.replace('data:text/html;base64,', '')));
        } catch {
          setFetchedHtml(null);
        }
      }
      setIsLoading(false);
      return;
    }

    // 3. Check raw HTML in fileUrl or raw string
    if (fileUrl.trim().startsWith('<!DOCTYPE html') || fileUrl.trim().startsWith('<html') || (fileUrl.includes('</') && fileUrl.includes('<script'))) {
      setFetchedHtml(fileUrl);
      setIsLoading(false);
      return;
    }

    // 4. If it is an external or Supabase Storage URL (.html file), attempt to fetch it for seamless srcDoc embedding
    const isHtmlUrl = fileUrl.toLowerCase().includes('.html') || fileUrl.toLowerCase().includes('.htm') || fileUrl.includes('/storage/');
    const isImage = fileUrl.startsWith('https://images.unsplash.com') || /\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i.test(fileUrl);

    if ((fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) && !isImage) {
      if (isHtmlUrl) {
        fetch(fileUrl)
          .then(res => {
            if (res.ok) return res.text();
            throw new Error('Network response not ok');
          })
          .then(text => {
            if (text && (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<script') || text.includes('<div') || text.includes('<body'))) {
              setFetchedHtml(text);
            }
          })
          .catch(() => {
            // Ignore fetch error; viewer will use iframe src directly
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      }
    }

    // 5. Check if built-in educational simulation matches the topic/title
    const builtinSim = getSimulationContent(resource);
    if (builtinSim) {
      setFetchedHtml(builtinSim);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [resource, isOpen]);

  // If not open, safely return null AFTER all hooks have executed
  if (!isOpen) {
    return null;
  }

  // Safe fallback if open but resource object is missing or invalid
  if (!resource || typeof resource !== 'object') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-900/50 text-rose-400 flex items-center justify-center mx-auto border border-rose-700/50">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">تعذر تشغيل المورد التعليمي</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            بيانات المورد غير متوفرة أو لم يكتمل تحميلها من قاعدة البيانات.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            إغلاق المشغل
          </button>
        </div>
      </div>
    );
  }

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('تم نسخ رابط المورد إلى الحافظة بنجاح', 'info');
    }
  };

  // Determine effective HTML content for srcDoc
  const resolvedHtmlContent = resource?.htmlContent || resource?.html_content || fetchedHtml || (resource ? getSimulationContent(resource) : null);

  const fileUrl = resource?.fileUrl || resource?.file_url || resource?.url || '';
  const isImage = fileUrl.startsWith('https://images.unsplash.com') || /\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i.test(fileUrl);
  const isStorageOrHtmlUrl = (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) && !isImage && (fileUrl.toLowerCase().includes('.html') || fileUrl.toLowerCase().includes('.htm') || fileUrl.includes('/storage/'));

  // Determine whether to use srcDoc or public src URL
  let effectiveSrcDoc: string | undefined = undefined;
  let effectiveSrc: string | undefined = undefined;

  if (resolvedHtmlContent) {
    effectiveSrcDoc = resolvedHtmlContent;
  } else if (isStorageOrHtmlUrl) {
    effectiveSrc = fileUrl;
  } else if (isInteractive || resource?.type === 'simulation' || (resource?.resourceType || '').toLowerCase().includes('simulation') || (resource?.resourceType || '').includes('محاكاة') || (resource?.resourceType || '').includes('تفاعلي')) {
    effectiveSrcDoc = generateInteractiveSimulationShell(resource);
  } else if (fileUrl && fileUrl.toLowerCase().endsWith('.pdf')) {
    effectiveSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  } else {
    effectiveSrcDoc = generateInteractiveSimulationShell(resource);
  }

  const safeTitle = resource?.title || 'مورد تعليمي';
  const safeGrade = resource?.gradeName || 'الصف العاشر';
  const safeSubject = resource?.subjectName || 'العلوم';
  const safeType = resource?.resourceType || resource?.type || 'محاكاة';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <ErrorBoundary title="مشغل المحاكاة والتجارب التفاعلية" onReset={onClose}>
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
                  {safeTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
                  <span className="text-cyan-400 font-semibold">{safeGrade}</span>
                  <span>•</span>
                  <span>{safeSubject}</span>
                  <span>•</span>
                  <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                    {safeType}
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

              {fileUrl && fileUrl.startsWith('http') && !isImage && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="فتح في نافذة جديدة"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {resource?.allowDownload !== false && (
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
              srcDoc={effectiveSrcDoc}
              src={effectiveSrcDoc ? undefined : effectiveSrc}
              title={safeTitle}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-none bg-slate-950"
              // Security Sandbox allowing scripts, forms, and popups for simulations in isolated opaque origin:
              sandbox="allow-scripts allow-forms allow-popups"
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
              إعداد وتطوير: مدرسة محلاح للبنات
            </span>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default ResourceViewer;
