import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import {
  ExternalLink,
  Download,
  Presentation,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  LayoutGrid,
  FileQuestion,
  Sparkles
} from 'lucide-react';

export interface PptxViewerProps {
  url: string;
  title?: string;
  onDownload?: () => void;
  className?: string;
}

interface SlideTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSizePt?: number;
}

interface SlideParagraph {
  align?: 'left' | 'center' | 'right' | 'justify';
  runs: SlideTextRun[];
}

interface SlideShapeElement {
  id: string;
  type: 'shape';
  left: number;   // 0 - 100%
  top: number;    // 0 - 100%
  width: number;  // 0 - 100%
  height: number; // 0 - 100%
  backgroundColor?: string;
  paragraphs: SlideParagraph[];
}

interface SlideImageElement {
  id: string;
  type: 'image';
  left: number;
  top: number;
  width: number;
  height: number;
  imageUrl: string;
  alt?: string;
}

interface SlideTableElement {
  id: string;
  type: 'table';
  left: number;
  top: number;
  width: number;
  height: number;
  rows: Array<Array<{ text: string; bg?: string }>>;
}

type SlideElement = SlideShapeElement | SlideImageElement | SlideTableElement;

interface SlideData {
  index: number;
  slideNumber: number;
  backgroundColor?: string;
  elements: SlideElement[];
  plainText: string;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({
  url,
  title = 'عرض تقديمي PowerPoint',
  onDownload,
  className = 'h-[70vh] min-h-[500px] w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('جارٍ الاتصال واسترجاع العرض التقديمي...');
  const [error, setError] = useState<string | null>(null);

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Keep track of created object URLs to revoke them on cleanup
  const objectUrlsRef = useRef<string[]>([]);

  const revokeAllObjectUrls = useCallback(() => {
    if (objectUrlsRef.current.length > 0) {
      objectUrlsRef.current.forEach(u => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          // Ignore revoke errors
        }
      });
      objectUrlsRef.current = [];
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllObjectUrls();
    };
  }, [revokeAllObjectUrls]);

  // Main PPTX loader and parser
  useEffect(() => {
    let isCancelled = false;

    const loadPptx = async () => {
      if (!url) {
        setLoading(false);
        setError('رابط ملف العرض التقديمي غير متوفر.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setLoadingProgress('جارٍ تحميل ملف PowerPoint من التخزين السحابي...');
        revokeAllObjectUrls();

        // 1. Fetch the raw PPTX file bytes
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`تعذر استرجاع ملف العرض (رمز الاستجابة: ${response.status})`);
        }

        if (isCancelled) return;
        setLoadingProgress('جارٍ فك حزمة العرض واستخراج الشرائح...');
        const arrayBuffer = await response.arrayBuffer();

        if (isCancelled) return;

        // 2. Load zip archive with JSZip
        let zip: JSZip;
        try {
          zip = await JSZip.loadAsync(arrayBuffer);
        } catch (zipErr) {
          console.warn('JSZip failed to unpack file, might be legacy binary .ppt format:', zipErr);
          throw new Error('هذا الملف قد يكون بتنسيق PowerPoint الثنائي القديم (.ppt) أو حزمة غير قياسية.');
        }

        if (isCancelled) return;

        // 3. Determine presentation dimensions and aspect ratio
        let slideCx = 9144000;
        let slideCy = 6858000;
        const presFile = zip.file('ppt/presentation.xml');
        if (presFile) {
          try {
            const presXml = await presFile.async('text');
            const szMatch = presXml.match(/<p:sldSz[^>]+cx="(\d+)"[^>]+cy="(\d+)"/);
            if (szMatch) {
              const cx = parseInt(szMatch[1], 10);
              const cy = parseInt(szMatch[2], 10);
              if (cx > 0 && cy > 0) {
                slideCx = cx;
                slideCy = cy;
                setAspectRatio(cx / cy);
              }
            }
          } catch (e) {
            console.warn('Could not read presentation.xml size, using default 4:3', e);
          }
        }

        // 4. Find all slide files in order
        // Check presentation relationships or find ppt/slides/slideN.xml
        const slideFiles = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          throw new Error('لم يتم العثور على شرائح صالحة داخل حزمة العرض التقديمي.');
        }

        setLoadingProgress(`جارٍ معالجة وتجهيز ${slideFiles.length} شريحة تعليمية...`);

        const parsedSlides: SlideData[] = [];
        const domParser = new DOMParser();

        // 5. Parse each slide
        for (let i = 0; i < slideFiles.length; i++) {
          if (isCancelled) return;

          const slideFileName = slideFiles[i];
          const slideNumber = i + 1;
          const slideXmlStr = await zip.file(slideFileName)!.async('text');

          // Read relationships for images: ppt/slides/_rels/slide{N}.xml.rels
          const relsFileName = slideFileName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
          const relsFile = zip.file(relsFileName);
          const relMap: Record<string, string> = {};

          if (relsFile) {
            try {
              const relsXmlStr = await relsFile.async('text');
              const relMatches = [...relsXmlStr.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)];
              for (const m of relMatches) {
                let target = m[2];
                if (target.startsWith('../')) {
                  target = 'ppt/' + target.slice(3);
                } else if (!target.startsWith('ppt/')) {
                  target = 'ppt/slides/' + target;
                }
                relMap[m[1]] = target;
              }
            } catch (relErr) {
              console.warn('Failed parsing relationships for', slideFileName, relErr);
            }
          }

          // Preload referenced images for this slide as blob object URLs
          const imageBlobUrls: Record<string, string> = {};
          for (const rId in relMap) {
            const mediaPath = relMap[rId];
            if (mediaPath.includes('media/')) {
              const imgZipFile = zip.file(mediaPath);
              if (imgZipFile) {
                try {
                  const blob = await imgZipFile.async('blob');
                  const objUrl = URL.createObjectURL(blob);
                  objectUrlsRef.current.push(objUrl);
                  imageBlobUrls[rId] = objUrl;
                } catch (imgErr) {
                  console.warn('Failed extracting image', mediaPath, imgErr);
                }
              }
            }
          }

          // Parse slide XML with DOMParser
          let slideDoc: Document;
          try {
            slideDoc = domParser.parseFromString(slideXmlStr, 'application/xml');
          } catch {
            slideDoc = domParser.parseFromString(slideXmlStr, 'text/xml');
          }

          // Background color detection
          let slideBgColor: string | undefined = undefined;
          const bgClrElem = slideDoc.querySelector('p\\:bg a\\:srgbClr, bg a\\:srgbClr, p\\:bgPr a\\:srgbClr, bgPr a\\:srgbClr');
          if (bgClrElem) {
            const val = bgClrElem.getAttribute('val');
            if (val) slideBgColor = `#${val}`;
          }

          const elements: SlideElement[] = [];
          const textCollector: string[] = [];

          // Helper to extract transform coordinates (x, y, cx, cy) in percentages
          const extractTransform = (parentElem: Element) => {
            const xfrm = parentElem.querySelector('a\\:xfrm, xfrm');
            if (!xfrm) return null;

            const off = xfrm.querySelector('a\\:off, off');
            const ext = xfrm.querySelector('a\\:ext, ext');
            if (!off || !ext) return null;

            const rawX = parseInt(off.getAttribute('x') || '0', 10);
            const rawY = parseInt(off.getAttribute('y') || '0', 10);
            const rawCx = parseInt(ext.getAttribute('cx') || '0', 10);
            const rawCy = parseInt(ext.getAttribute('cy') || '0', 10);

            const left = Math.max(0, Math.min(100, (rawX / slideCx) * 100));
            const top = Math.max(0, Math.min(100, (rawY / slideCy) * 100));
            const width = Math.max(1, Math.min(100, (rawCx / slideCx) * 100));
            const height = Math.max(1, Math.min(100, (rawCy / slideCy) * 100));

            return { left, top, width, height };
          };

          // A. Parse Shapes / Textboxes: <p:sp>
          const shapeNodes = Array.from(slideDoc.querySelectorAll('p\\:sp, sp'));
          for (let sIdx = 0; sIdx < shapeNodes.length; sIdx++) {
            const sp = shapeNodes[sIdx];
            const tf = extractTransform(sp);
            if (!tf) continue;

            // Background color of shape
            let shapeBg: string | undefined = undefined;
            const solidFill = sp.querySelector('p\\:spPr > a\\:solidFill > a\\:srgbClr, spPr > solidFill > srgbClr');
            if (solidFill) {
              const val = solidFill.getAttribute('val');
              if (val) shapeBg = `#${val}`;
            }

            // Paragraphs & Runs
            const paragraphs: SlideParagraph[] = [];
            const pNodes = Array.from(sp.querySelectorAll('p\\:txBody > a\\:p, txBody > p, a\\:p'));

            for (const pNode of pNodes) {
              const pPr = pNode.querySelector('a\\:pPr, pPr');
              const algn = pPr?.getAttribute('algn');
              let align: 'left' | 'center' | 'right' | 'justify' = 'right';
              if (algn === 'ctr') align = 'center';
              else if (algn === 'l') align = 'left';
              else if (algn === 'just') align = 'justify';

              const runs: SlideTextRun[] = [];
              const rNodes = Array.from(pNode.querySelectorAll('a\\:r, r, a\\:fld, fld'));

              for (const rNode of rNodes) {
                const tElem = rNode.querySelector('a\\:t, t');
                const text = tElem?.textContent || '';
                if (!text) continue;

                textCollector.push(text);

                const rPr = rNode.querySelector('a\\:rPr, rPr');
                const bold = rPr ? (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true') : false;
                const italic = rPr ? (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true') : false;
                const underline = rPr ? (rPr.getAttribute('u') === 'sng') : false;
                const sz = rPr ? parseInt(rPr.getAttribute('sz') || '0', 10) : 0;
                const fontSizePt = sz > 0 ? sz / 100 : undefined;

                let color: string | undefined = undefined;
                const clrElem = rNode.querySelector('a\\:solidFill > a\\:srgbClr, solidFill > srgbClr');
                if (clrElem) {
                  const val = clrElem.getAttribute('val');
                  if (val) color = `#${val}`;
                }

                runs.push({
                  text,
                  bold,
                  italic,
                  underline,
                  color,
                  fontSizePt
                });
              }

              if (runs.length > 0) {
                paragraphs.push({ align, runs });
              }
            }

            // Only add if there is content or visible background
            if (paragraphs.length > 0 || shapeBg) {
              elements.push({
                id: `sp-${slideNumber}-${sIdx}`,
                type: 'shape',
                left: tf.left,
                top: tf.top,
                width: tf.width,
                height: tf.height,
                backgroundColor: shapeBg,
                paragraphs
              });
            }
          }

          // B. Parse Pictures / Images: <p:pic>
          const picNodes = Array.from(slideDoc.querySelectorAll('p\\:pic, pic'));
          for (let pIdx = 0; pIdx < picNodes.length; pIdx++) {
            const pic = picNodes[pIdx];
            const tf = extractTransform(pic);
            if (!tf) continue;

            const blip = pic.querySelector('a\\:blip, blip');
            if (!blip) continue;

            // Extract embed relationship id
            const embedId = blip.getAttribute('r:embed') ||
                            blip.getAttribute('embed') ||
                            blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');

            if (embedId && imageBlobUrls[embedId]) {
              elements.push({
                id: `pic-${slideNumber}-${pIdx}`,
                type: 'image',
                left: tf.left,
                top: tf.top,
                width: tf.width,
                height: tf.height,
                imageUrl: imageBlobUrls[embedId],
                alt: `صورة شريحة ${slideNumber}`
              });
            }
          }

          // C. Parse Tables: <a:tbl> in <p:graphicFrame>
          const tableNodes = Array.from(slideDoc.querySelectorAll('p\\:graphicFrame, graphicFrame'));
          for (let tIdx = 0; tIdx < tableNodes.length; tIdx++) {
            const frame = tableNodes[tIdx];
            const tf = extractTransform(frame);
            if (!tf) continue;

            const tbl = frame.querySelector('a\\:tbl, tbl');
            if (!tbl) continue;

            const trNodes = Array.from(tbl.querySelectorAll('a\\:tr, tr'));
            const tableRows: Array<Array<{ text: string; bg?: string }>> = [];

            for (const tr of trNodes) {
              const tcNodes = Array.from(tr.querySelectorAll('a\\:tc, tc'));
              const rowCells: Array<{ text: string; bg?: string }> = [];

              for (const tc of tcNodes) {
                const cellTexts: string[] = [];
                const tElems = Array.from(tc.querySelectorAll('a\\:t, t'));
                for (const t of tElems) {
                  if (t.textContent) cellTexts.push(t.textContent);
                }
                const cellText = cellTexts.join(' ');
                if (cellText) textCollector.push(cellText);
                rowCells.push({ text: cellText });
              }

              if (rowCells.length > 0) {
                tableRows.push(rowCells);
              }
            }

            if (tableRows.length > 0) {
              elements.push({
                id: `tbl-${slideNumber}-${tIdx}`,
                type: 'table',
                left: tf.left,
                top: tf.top,
                width: tf.width,
                height: tf.height,
                rows: tableRows
              });
            }
          }

          parsedSlides.push({
            index: i,
            slideNumber,
            backgroundColor: slideBgColor,
            elements,
            plainText: textCollector.join(' ')
          });
        }

        if (isCancelled) return;

        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
        setLoading(false);
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('PPTX rendering exception:', err);
        setError(msg || 'تعذر تحليل وعرض شرائح PowerPoint.');
        setLoading(false);
      }
    };

    loadPptx();

    return () => {
      isCancelled = true;
    };
  }, [url, revokeAllObjectUrls]);

  // Navigation handlers
  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hijacking inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End' && slides.length > 0) {
        e.preventDefault();
        setCurrentSlideIndex(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, slides.length]);

  const currentSlide = slides[currentSlideIndex];

  // Microsoft Office Online viewer fallback link
  const officeOnlineUrl = useMemo(() => {
    if (!url || !url.startsWith('http')) return null;
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
  }, [url]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-xl select-none ${className} ${
        isFullscreen ? '!fixed !inset-0 !z-50 !h-screen !w-screen !rounded-none !border-none' : ''
      }`}
      dir="rtl"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/90 border-b border-slate-800 text-xs shrink-0 z-20">
        {/* Title & Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-sm text-white font-bold">
            <Presentation className="w-4 h-4" />
          </div>
          <div className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            <span className="font-bold text-slate-100 truncate block text-xs">{title}</span>
            <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>مشغل PowerPoint الذكي (مكتبة العلوم)</span>
            </span>
          </div>
        </div>

        {/* Slide Navigation Controls */}
        {slides.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-200 transition-colors cursor-pointer"
              title="الشريحة السابقة (السهم الأيمن)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-bold text-slate-300 px-1 min-w-[75px] text-center">
              {currentSlideIndex + 1} / {slides.length}
            </span>

            <button
              type="button"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-200 transition-colors cursor-pointer"
              title="الشريحة التالية (السهم الأيسر)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View & Utility Actions */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Thumbnails */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                showThumbnails
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={showThumbnails ? 'إخفاء شريط المصغرات' : 'إظهار شريط المصغرات'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
              title="تصغير العرض"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
              className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer"
              title="تكبير العرض"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoom !== 1.0 && (
              <button
                type="button"
                onClick={() => setZoom(1.0)}
                className="p-1 hover:bg-slate-800 text-amber-400 rounded cursor-pointer"
                title="إعادة ضبط المقياس"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Open in New Window Link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="فتح ملف PowerPoint الأصلي في نافذة جديدة"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">نافذة جديدة</span>
            </a>
          )}

          {/* Direct Download Button */}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
              title="تحميل ملف العرض التقديمي الأصلي"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تحميل</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xs p-6 text-center text-white">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
            <h4 className="text-sm font-bold text-slate-100 mb-1">جارٍ استخراج وتجهيز شرائح PowerPoint</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{loadingProgress}</p>
          </div>
        )}

        {/* Error Fallback State */}
        {!loading && error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">تعذر استعراض شرائح العرض مباشرة</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              {error}
              <br />
              الملف محفوظ بأمان ومتاح للتحميل الفوري أو الفتح المباشر عبر تطبيق PowerPoint.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف PowerPoint الأصلي</span>
                </button>
              )}

              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح الرابط المباشر للملف</span>
                </a>
              )}

              {officeOnlineUrl && (
                <a
                  href={officeOnlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-sky-900/60 hover:bg-sky-800/80 text-sky-200 font-bold text-xs flex items-center gap-2 border border-sky-700/50 cursor-pointer transition-all"
                >
                  <Presentation className="w-4 h-4" />
                  <span>معاينة عبر Microsoft Office Online</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Active Slide Canvas Viewport */}
        {!loading && !error && currentSlide && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto bg-slate-950">
            <div
              className="relative transition-transform duration-200 ease-out origin-center flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              {/* Slide Canvas with exact aspect ratio */}
              <div
                className="relative bg-white text-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-700/60 select-text"
                style={{
                  width: '100%',
                  aspectRatio: `${aspectRatio}`,
                  minWidth: isFullscreen ? '75vw' : 'min(100%, 720px)',
                  backgroundColor: currentSlide.backgroundColor || '#ffffff'
                }}
              >
                {/* Render Slide Elements */}
                {currentSlide.elements.map(elem => {
                  if (elem.type === 'shape') {
                    return (
                      <div
                        key={elem.id}
                        className="absolute flex flex-col justify-center overflow-hidden p-1.5 leading-snug rounded-xs"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          backgroundColor: elem.backgroundColor || 'transparent'
                        }}
                      >
                        {elem.paragraphs.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="w-full my-0.5 leading-relaxed"
                            style={{ textAlign: p.align || 'right' }}
                          >
                            {p.runs.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                style={{
                                  fontWeight: r.bold ? 'bold' : 'normal',
                                  fontStyle: r.italic ? 'italic' : 'normal',
                                  textDecoration: r.underline ? 'underline' : 'none',
                                  color: r.color || 'inherit',
                                  fontSize: r.fontSizePt
                                    ? `clamp(11px, ${(r.fontSizePt / 24).toFixed(2)}rem, 36px)`
                                    : 'inherit'
                                }}
                              >
                                {r.text}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (elem.type === 'image') {
                    return (
                      <div
                        key={elem.id}
                        className="absolute overflow-hidden flex items-center justify-center"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`
                        }}
                      >
                        <img
                          src={elem.imageUrl}
                          alt={elem.alt || 'صورة الشريحة'}
                          className="w-full h-full object-contain pointer-events-none select-none"
                          loading="lazy"
                        />
                      </div>
                    );
                  }

                  if (elem.type === 'table') {
                    return (
                      <div
                        key={elem.id}
                        className="absolute overflow-auto border border-slate-300 rounded"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`
                        }}
                      >
                        <table className="w-full h-full text-xs text-right border-collapse bg-white/90">
                          <tbody>
                            {elem.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-200">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1 border-l border-slate-200 text-slate-800">
                                    {cell.text}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Empty Slide Fallback */}
                {currentSlide.elements.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <FileQuestion className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs font-semibold">شريحة فارغة أو غير محتوية على نصوص أو صور</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Side Thumbnails Strip (Toggleable) */}
        {!loading && !error && showThumbnails && slides.length > 1 && (
          <div className="w-full md:w-56 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-2 shrink-0 max-h-36 md:max-h-none">
            <div className="hidden md:flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800/80 mb-1">
              <span>جميع الشرائح</span>
              <span className="text-amber-400">{slides.length}</span>
            </div>

            {slides.map(slide => {
              const isActive = slide.index === currentSlideIndex;
              return (
                <button
                  key={slide.index}
                  type="button"
                  onClick={() => setCurrentSlideIndex(slide.index)}
                  className={`group relative flex md:flex-col items-center text-right p-2 rounded-xl border transition-all cursor-pointer shrink-0 w-36 md:w-full ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 text-amber-200'
                      : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                      {slide.slideNumber}
                    </span>
                    <span className="text-[9px] text-slate-500 truncate max-w-[80px]">
                      {slide.elements.length} عناصر
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed w-full min-h-[1.8rem]">
                    {slide.plainText.trim() || 'شريحة صور أو وسائط'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer Notice */}
      <div className="px-4 py-2 bg-slate-950 text-slate-400 text-[11px] flex items-center justify-between border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="truncate">
            مكتبة العلوم الرقمية • استعراض مباشر لملفات PowerPoint (.pptx)
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-slate-500">
            استخدم الأسهم (← / →) للتنقل بين الشرائح
          </span>
        </div>
      </div>
    </div>
  );
};

export default PptxViewer;
