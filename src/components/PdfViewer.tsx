import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Download, FileText, ChevronRight, ChevronLeft, ZoomIn, ZoomOut, RotateCw, Loader2, AlertCircle } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title?: string;
  onDownload?: () => void;
  className?: string;
}

// Dynamically load PDF.js from Cloudflare CDN to render real canvas pages
// without inflating bundle size or breaking SSR/Vite
const PDFJS_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title = 'مستند PDF',
  onDownload,
  className = 'h-[70vh] min-h-[500px] w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);

  // Load PDF.js library script once
  useEffect(() => {
    let isCancelled = false;

    const loadPdfJs = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT_URL}"]`);
            if (existingScript) {
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', () => reject(new Error('Failed to load PDF.js script')));
              return;
            }

            const script = document.createElement('script');
            script.src = PDFJS_SCRIPT_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
            document.head.appendChild(script);
          });
        }

        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        }

        if (isCancelled) return;

        // Fetch & load PDF document
        const loadingTask = window.pdfjsLib.getDocument({
          url,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PDF.js loading error:', err);
        setError(err.message || 'تعذر تحميل صفحات ملف PDF');
        setLoading(false);
      }
    };

    if (url) {
      loadPdfJs();
    } else {
      setLoading(false);
      setError('رابط المستند غير متوفر');
    }

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;
    let isCancelled = false;

    const renderCurrentPage = async () => {
      try {
        setRenderingPage(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Calculate viewport with scale & rotation
        const viewport = page.getViewport({ scale, rotation });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;

        if (!isCancelled) {
          setRenderingPage(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('Page rendering error:', err);
          setRenderingPage(false);
        }
      }
    };

    renderCurrentPage();

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale, rotation]);

  const handlePrevPage = () => {
    if (pageNum > 1) setPageNum(p => p - 1);
  };

  const handleNextPage = () => {
    if (pageNum < numPages) setPageNum(p => p + 1);
  };

  const handleZoomIn = () => {
    setScale(s => Math.min(s + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setScale(s => Math.max(s - 0.25, 0.6));
  };

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360);
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-inner flex flex-col ${className}`}>
      {/* Top PDF Controls Toolbar */}
      <div className="px-3 py-2 bg-slate-800 text-slate-100 flex items-center justify-between gap-2 border-b border-slate-700 shrink-0 z-20 select-none">
        {/* Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={pageNum <= 1 || loading}
            title="الصفحة السابقة"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold px-2 text-slate-200 dir-ltr whitespace-nowrap">
            {loading ? '... / ...' : `${pageNum} / ${numPages}`}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={pageNum >= numPages || loading}
            title="الصفحة التالية"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || loading}
            title="تصغير"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono px-1.5 text-slate-300 hidden sm:inline">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || loading}
            title="تكبير"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            disabled={loading}
            title="تدوير"
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Actions (Open in new window & Download) */}
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="فتح PDF في نافذة جديدة"
            className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">فتح في نافذة جديدة</span>
          </a>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              title="تحميل الملف"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Page Canvas Display / Fallback Container */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-auto bg-slate-900/90 flex items-center justify-center p-4 relative"
      >
        {/* Loading Spinner */}
        {(loading || renderingPage) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-xs text-white">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-2" />
            <p className="text-xs font-semibold text-slate-300">جارٍ تحميل صفحات المستند...</p>
          </div>
        )}

        {/* Error / Fallback State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-300 space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">تعذر عرض صفحات PDF مباشرة داخل المستعرض</p>
              <p className="text-xs text-slate-400">
                يمكنك فتح ملف PDF في نافذة جديدة أو تحميله مباشرة لعرض كامل الصفحات والمحتوى بدقة عالية.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>فتح PDF في نافذة جديدة</span>
              </a>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الملف</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rendered PDF Page Canvas */}
        <canvas
          ref={canvasRef}
          className={`shadow-2xl rounded-sm max-w-none transition-transform duration-150 ${error ? 'hidden' : 'block'}`}
          style={{ margin: 'auto' }}
        />
      </div>
    </div>
  );
};

export default PdfViewer;
