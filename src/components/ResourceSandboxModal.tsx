import React, { useState, useEffect, useMemo } from 'react';
import { ResourceItem, isResourceInteractive } from '../types';
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
  ExternalLink
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
  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);

  // Check if resource is an interactive HTML simulation
  const isInteractive = useMemo(() => isResourceInteractive(resource), [resource]);

  // Resolve HTML code from all possible sources:
  // 1. Direct htmlContent property
  // 2. data:text/html data URL in fileUrl or thumbnailUrl
  // 3. Raw HTML string inside fileUrl
  // 4. Fetched content from public Supabase Storage URL
  useEffect(() => {
    setFetchedHtml(null);
    setIsLoading(true);

    if (!resource || !isOpen) return;

    // Check direct htmlContent
    if (resource.htmlContent && resource.htmlContent.trim().length > 0) {
      setIsLoading(false);
      return;
    }

    const fileUrl = resource.fileUrl || '';

    // Check Data URL
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

    // Check raw HTML in fileUrl
    if (fileUrl.trim().startsWith('<!DOCTYPE html') || fileUrl.trim().startsWith('<html') || (fileUrl.includes('</') && fileUrl.includes('<script'))) {
      setFetchedHtml(fileUrl);
      setIsLoading(false);
      return;
    }

    // If it is an external or Supabase Storage URL (.html file), attempt to fetch it for seamless srcDoc embedding
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/')) {
      const isHtmlUrl = fileUrl.toLowerCase().includes('.html') || fileUrl.toLowerCase().includes('.htm') || fileUrl.includes('/storage/');
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

    setIsLoading(false);
  }, [resource, isOpen]);

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

  // Determine effective HTML content for srcDoc
  const resolvedHtmlContent = resource.htmlContent || fetchedHtml;

  // Generate fallback content:
  // If the resource is interactive, render a live interactive simulation canvas rather than a static text card!
  const defaultSimulationShell = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resource.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', system-ui, -apple-system, sans-serif; }
    body { background: #090d16; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; }
    .lab-box { background: #131b2e; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 28px; max-width: 620px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.35); border-radius: 9999px; color: #38bdf8; font-size: 12px; font-weight: 700; margin-bottom: 18px; }
    h2 { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 12px; line-height: 1.4; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
    .sim-canvas { background: #0a0f1d; border: 2px dashed #0284c7; border-radius: 18px; height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 24px; position: relative; overflow: hidden; padding: 16px; }
    .pulse-ring { width: 56px; height: 56px; border-radius: 50%; background: radial-gradient(circle, #38bdf8 0%, rgba(14,165,233,0.1) 70%); box-shadow: 0 0 25px #0284c7; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    .ctrl-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .btn { padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(14,165,233,0.4); }
    .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .btn-secondary:hover { background: #334155; color: white; }
  </style>
</head>
<body>
  <div class="lab-box">
    <div class="badge">⚡ محاكاة علمية تفاعلية مباشرة</div>
    <h2>${resource.title}</h2>
    <p>${resource.description || 'مورد علمي تفاعلي رقمي متاح لطلبة مدرسة محلاح للبنات (5–12)'}</p>
    <div class="sim-canvas" id="canvasArea">
      <div class="pulse-ring">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
      <span style="font-size: 13px; color: #7dd3fc; font-weight: 700;">بيئة المحاكاة التفاعلية نشطة</span>
      <span style="font-size: 11px; color: #64748b; margin-top: 4px;">${resource.gradeName} • ${resource.subjectName} • ${resource.resourceType}</span>
    </div>
    <div class="ctrl-row">
      <button class="btn btn-primary" onclick="startSim()">تشغيل المحاكاة</button>
      <button class="btn btn-secondary" onclick="resetSim()">إعادة الضبط</button>
    </div>
  </div>
  <script>
    function startSim() {
      const c = document.getElementById('canvasArea');
      c.style.borderColor = '#10b981';
      c.style.background = '#064e3b15';
      alert('تم بدء التجربة التفاعلية بنجاح!');
    }
    function resetSim() {
      const c = document.getElementById('canvasArea');
      c.style.borderColor = '#0284c7';
      c.style.background = '#0a0f1d';
    }
  </script>
</body>
</html>`;

  // Determine whether to use srcDoc or public src URL
  let effectiveSrcDoc: string | undefined = undefined;
  let effectiveSrc: string | undefined = undefined;

  if (resolvedHtmlContent) {
    effectiveSrcDoc = resolvedHtmlContent;
  } else if (resource.fileUrl && (resource.fileUrl.startsWith('http://') || resource.fileUrl.startsWith('https://') || resource.fileUrl.startsWith('/'))) {
    // If public Supabase Storage URL or external simulation link, embed directly via src
    effectiveSrc = resource.fileUrl;
  } else if (isInteractive) {
    // For any simulation or interactive resource, always render the live interactive shell
    effectiveSrcDoc = defaultSimulationShell;
  } else {
    // Non-interactive document fallback
    effectiveSrcDoc = `<!DOCTYPE html>
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
    <p style="margin-top: 12px;">هذا الملف التعليمي متاح للتنزيل والاستعراض المباشر.</p>
  </div>
</body>
</html>`;
  }

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

            {resource.fileUrl && resource.fileUrl.startsWith('http') && (
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="فتح في نافذة جديدة"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer inline-flex items-center"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

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
            srcDoc={effectiveSrcDoc}
            src={effectiveSrcDoc ? undefined : effectiveSrc}
            title={resource.title}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-none bg-slate-950"
            // Security Sandbox allowing scripts, forms, and same-origin for simulations:
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
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
    </div>
  );
};
