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

export interface SlideBaseElement {
  id: string;
  left: number;   // 0 - 100%
  top: number;    // 0 - 100%
  width: number;  // 0 - 100%
  height: number; // 0 - 100%
  rotation?: number; // degrees
  flipH?: boolean;
  flipV?: boolean;
  zIndex: number;
}

export interface SlideShapeElement extends SlideBaseElement {
  type: 'shape';
  geometry?: string; // rect, roundRect, ellipse, etc.
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  paragraphs: SlideParagraph[];
}

export interface SlideImageElement extends SlideBaseElement {
  type: 'image';
  imageUrl: string;
  alt?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface SlideConnectorElement extends SlideBaseElement {
  type: 'connector';
  color?: string;
  strokeWidth?: number;
  headArrow?: boolean;
  tailArrow?: boolean;
}

export interface SlideTableElement extends SlideBaseElement {
  type: 'table';
  rows: Array<Array<{ text: string; bg?: string }>>;
}

export type SlideElement = SlideShapeElement | SlideImageElement | SlideConnectorElement | SlideTableElement;

interface SlideData {
  index: number;
  slideNumber: number;
  backgroundColor?: string;
  elements: SlideElement[];
  plainText: string;
}

/**
 * Namespace-agnostic element locator.
 */
function findByLocalName(parent: Element | Document, localName: string): Element[] {
  try {
    const list = parent.getElementsByTagNameNS('*', localName);
    if (list && list.length > 0) return Array.from(list);
  } catch {
    // ignore
  }

  try {
    const all = parent.getElementsByTagName('*');
    const matched: Element[] = [];
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (el.localName === localName || el.tagName === localName || el.tagName.endsWith(':' + localName)) {
        matched.push(el);
      }
    }
    return matched;
  } catch {
    return [];
  }
}

function findFirstByLocalName(parent: Element | Document, localName: string): Element | null {
  const matches = findByLocalName(parent, localName);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Parses XML string into DOM document with fallback
 */
function parseXmlDocument(xmlStr: string): Document | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'application/xml');
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError && parserError.length > 0) {
      return parser.parseFromString(xmlStr, 'text/xml');
    }
    return doc;
  } catch {
    try {
      const parser = new DOMParser();
      return parser.parseFromString(xmlStr, 'text/xml');
    } catch {
      return null;
    }
  }
}

/**
 * Extracts relationship targets from slide .rels XML
 */
function parseRelationshipsXml(relsXmlStr: string): Record<string, string> {
  const relMap: Record<string, string> = {};

  const doc = parseXmlDocument(relsXmlStr);
  if (doc) {
    const relElements = findByLocalName(doc, 'Relationship');
    for (const rel of relElements) {
      const id = rel.getAttribute('Id') || rel.getAttribute('id');
      let target = rel.getAttribute('Target') || rel.getAttribute('target');
      if (id && target) {
        if (target.startsWith('../')) {
          target = 'ppt/' + target.slice(3);
        } else if (!target.startsWith('ppt/')) {
          target = 'ppt/slides/' + target;
        }
        relMap[id] = target;
      }
    }
  }

  // Backup regex to handle any non-standard XML encoding or attribute orders
  if (Object.keys(relMap).length === 0) {
    const relTagRegex = /<Relationship\b([^>]+)\/?>/gi;
    let match: RegExpExecArray | null;
    while ((match = relTagRegex.exec(relsXmlStr)) !== null) {
      const attrs = match[1];
      const idM = attrs.match(/\bId="([^"]+)"/i);
      const targetM = attrs.match(/\bTarget="([^"]+)"/i);
      if (idM && targetM) {
        let target = targetM[1];
        if (target.startsWith('../')) {
          target = 'ppt/' + target.slice(3);
        } else if (!target.startsWith('ppt/')) {
          target = 'ppt/slides/' + target;
        }
        relMap[idM[1]] = target;
      }
    }
  }

  return relMap;
}

/**
 * Resolves color from node considering srgbClr and schemeClr against theme palette
 */
function resolveColor(node: Element | null, themeColors: Record<string, string>): string | undefined {
  if (!node) return undefined;

  // 1. Direct srgbClr
  const srgb = findFirstByLocalName(node, 'srgbClr');
  if (srgb) {
    const val = srgb.getAttribute('val');
    if (val && /^[0-9a-fA-F]{6}$/.test(val)) return `#${val}`;
  }

  // 2. Scheme color mapping to presentation theme
  const scheme = findFirstByLocalName(node, 'schemeClr');
  if (scheme) {
    const val = scheme.getAttribute('val');
    if (val && themeColors[val]) {
      return themeColors[val];
    }
  }

  // 3. System color (e.g. windowText)
  const sys = findFirstByLocalName(node, 'sysClr');
  if (sys) {
    const lastClr = sys.getAttribute('lastClr');
    if (lastClr && /^[0-9a-fA-F]{6}$/.test(lastClr)) return `#${lastClr}`;
  }

  return undefined;
}

/**
 * Extracts transform coordinates in percentages and rotation/flip
 */
function extractTransform(
  parentElem: Element,
  slideCx: number,
  slideCy: number
): {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
} | null {
  const xfrm = findFirstByLocalName(parentElem, 'xfrm');
  if (!xfrm) return null;

  const off = findFirstByLocalName(xfrm, 'off');
  const ext = findFirstByLocalName(xfrm, 'ext');
  if (!off || !ext) return null;

  const rawX = parseInt(off.getAttribute('x') || '0', 10);
  const rawY = parseInt(off.getAttribute('y') || '0', 10);
  const rawCx = parseInt(ext.getAttribute('cx') || '0', 10);
  const rawCy = parseInt(ext.getAttribute('cy') || '0', 10);

  const left = Math.max(0, Math.min(100, (rawX / slideCx) * 100));
  const top = Math.max(0, Math.min(100, (rawY / slideCy) * 100));
  const width = Math.max(0.5, Math.min(100, (rawCx / slideCx) * 100));
  const height = Math.max(0.5, Math.min(100, (rawCy / slideCy) * 100));

  const rotVal = xfrm.getAttribute('rot');
  const rotation = rotVal ? parseInt(rotVal, 10) / 60000 : undefined;
  const flipH = xfrm.getAttribute('flipH') === '1' || xfrm.getAttribute('flipH') === 'true';
  const flipV = xfrm.getAttribute('flipV') === '1' || xfrm.getAttribute('flipV') === 'true';

  return { left, top, width, height, rotation, flipH, flipV };
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
      // 0. Validate incoming URL
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        setLoading(false);
        setError('رابط ملف العرض التقديمي غير متوفر.');
        return;
      }

      const cleanUrl = url.trim();
      if (cleanUrl.startsWith('data:text/html') || cleanUrl.startsWith('<!DOCTYPE') || cleanUrl.startsWith('<html')) {
        setLoading(false);
        setError('الرابط المستلم يشير إلى محتوى نصي (HTML) بدلاً من ملف PowerPoint (.pptx) حقيقي.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setLoadingProgress('جارٍ تحميل ملف PowerPoint من التخزين السحابي...');
        revokeAllObjectUrls();

        // 1. Fetch the raw PPTX file bytes
        let response: Response;
        try {
          response = await fetch(cleanUrl, {
            headers: {
              Accept: 'application/vnd.openxmlformats-officedocument.presentationml.presentation,*/*'
            }
          });
        } catch (fetchErr: unknown) {
          const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          throw new Error(`تعذر الاتصال بالخادم لجلب ملف العرض: ${fetchMsg}`);
        }

        if (!response.ok) {
          throw new Error(`تعذر استرجاع ملف العرض من التخزين (رمز الاستجابة: ${response.status})`);
        }

        if (isCancelled) return;
        setLoadingProgress('جارٍ فك حزمة PowerPoint وقراءة القوالب والسمات...');
        const arrayBuffer = await response.arrayBuffer();

        if (isCancelled) return;

        // 2. Load zip archive with JSZip
        let zip: JSZip;
        try {
          zip = await JSZip.loadAsync(arrayBuffer);
        } catch (zipErr) {
          console.warn('JSZip failed to unpack file, might be legacy binary .ppt format:', zipErr);
          throw new Error('تعذر قراءة حزمة الملف. قد يكون الملف بتنسيق PowerPoint الثنائي القديم (.ppt) بدلاً من (.pptx) القياسي.');
        }

        if (isCancelled) return;

        // 3. Load Theme Colors (accent1 - accent6, dk1, lt1, etc.)
        const themeColors: Record<string, string> = {
          dk1: '#000000',
          lt1: '#ffffff',
          dk2: '#1f497d',
          lt2: '#eeece1',
          accent1: '#4f81bd',
          accent2: '#c0504d',
          accent3: '#9bbb59',
          accent4: '#8064a2',
          accent5: '#4bacc6',
          accent6: '#f79646',
          tx1: '#000000',
          tx2: '#1f497d',
          bg1: '#ffffff',
          bg2: '#eeece1'
        };

        const themeFile = zip.file('ppt/theme/theme1.xml');
        if (themeFile) {
          try {
            const themeXml = await themeFile.async('text');
            const clrMatches = [...themeXml.matchAll(/<a:(dk1|lt1|dk2|lt2|accent1|accent2|accent3|accent4|accent5|accent6|hlink|folHlink)>[\s\S]*?<a:srgbClr val="([^"]+)"/g)];
            clrMatches.forEach(m => {
              themeColors[m[1]] = `#${m[2]}`;
            });
          } catch (themeErr) {
            console.warn('Could not parse theme1.xml colors, using defaults:', themeErr);
          }
        }

        // 4. Determine presentation dimensions and aspect ratio
        let slideCx = 9144000;
        let slideCy = 6858000;
        const presFile = zip.file('ppt/presentation.xml');
        if (presFile) {
          try {
            const presXml = await presFile.async('text');
            const szMatch = presXml.match(/<p:sldSz[^>]+cx="(\d+)"[^>]+cy="(\d+)"/) || presXml.match(/cx="(\d+)"\s+cy="(\d+)"/);
            if (szMatch) {
              const cx = parseInt(szMatch[1], 10);
              const cy = parseInt(szMatch[2], 10);
              if (cx > 0 && cy > 0) {
                slideCx = cx;
                slideCy = cy;
                const ratio = Number((cx / cy).toFixed(4));
                setAspectRatio(ratio);
              }
            }
          } catch (e) {
            console.warn('Could not read presentation.xml size, using default 4:3', e);
          }
        }

        // 5. Find all slide files in order
        const slideFiles = Object.keys(zip.files)
          .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          throw new Error('لم يتم العثور على شرائح صالحة داخل حزمة العرض التقديمي (.pptx).');
        }

        setLoadingProgress(`جارٍ استخراج وتجهيز ${slideFiles.length} شريحة تعليمية بجميع عناصرها...`);

        const parsedSlides: SlideData[] = [];

        // 6. Parse each slide preserving exact DOM Z-order
        for (let i = 0; i < slideFiles.length; i++) {
          if (isCancelled) return;

          const slideFileName = slideFiles[i];
          const slideNumber = i + 1;
          const slideXmlStr = await zip.file(slideFileName)!.async('text');

          // Read relationships for media/images: ppt/slides/_rels/slide{N}.xml.rels
          const relsFileName = slideFileName.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
          const relsFile = zip.file(relsFileName);
          let relMap: Record<string, string> = {};

          if (relsFile) {
            try {
              const relsXmlStr = await relsFile.async('text');
              relMap = parseRelationshipsXml(relsXmlStr);
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

          // Parse slide XML with namespace-agnostic DOM parser
          const slideDoc = parseXmlDocument(slideXmlStr);

          // Background color detection
          let slideBgColor: string | undefined = undefined;
          if (slideDoc) {
            const bgNode = findFirstByLocalName(slideDoc, 'bg') || findFirstByLocalName(slideDoc, 'bgPr');
            if (bgNode) {
              slideBgColor = resolveColor(bgNode, themeColors);
            }
          }

          const elements: SlideElement[] = [];
          const textCollector: string[] = [];

          // Helper to extract shape border/line
          const extractBorder = (spNode: Element) => {
            const ln = findFirstByLocalName(spNode, 'ln');
            if (!ln) return { borderColor: undefined, borderWidth: undefined, borderStyle: undefined };

            const borderColor = resolveColor(ln, themeColors);
            const wAttr = ln.getAttribute('w');
            // w is in EMUs (1 pt = 12700 EMUs, or 9525 EMUs)
            const borderWidth = wAttr ? Math.max(1, Math.round(parseInt(wAttr, 10) / 12700)) : (borderColor ? 1 : undefined);
            
            let borderStyle = 'solid';
            const prstDash = findFirstByLocalName(ln, 'prstDash');
            if (prstDash) {
              const dashVal = prstDash.getAttribute('val');
              if (dashVal?.includes('dash')) borderStyle = 'dashed';
              else if (dashVal?.includes('dot')) borderStyle = 'dotted';
            }

            return { borderColor, borderWidth, borderStyle };
          };

          // Helper to extract shape background
          const extractBackground = (spNode: Element) => {
            const spPr = findFirstByLocalName(spNode, 'spPr');
            if (!spPr) return undefined;
            return resolveColor(spPr, themeColors);
          };

          if (slideDoc) {
            const spTree = findFirstByLocalName(slideDoc, 'spTree');
            if (spTree) {
              // Traverse children of spTree in document order to guarantee proper layer ordering (Z-Index)
              const children = Array.from(spTree.children);

              for (let cIdx = 0; cIdx < children.length; cIdx++) {
                const child = children[cIdx];
                const nodeType = child.localName;
                const zIndex = cIdx + 1; // Preserve exact XML DOM order as Z-index

                // A. Parse Shapes and Text Boxes: <p:sp>
                if (nodeType === 'sp') {
                  const tf = extractTransform(child, slideCx, slideCy);
                  if (!tf) continue;

                  const geometry = findFirstByLocalName(child, 'prstGeom')?.getAttribute('prst') || 'rect';
                  const shapeBg = extractBackground(child);
                  const { borderColor, borderWidth, borderStyle } = extractBorder(child);

                  // Extract text paragraphs and runs
                  const paragraphs: SlideParagraph[] = [];
                  const txBody = findFirstByLocalName(child, 'txBody');
                  const pNodes = txBody ? findByLocalName(txBody, 'p') : [];

                  for (const pNode of pNodes) {
                    const pPr = findFirstByLocalName(pNode, 'pPr');
                    const algn = pPr?.getAttribute('algn');
                    let align: 'left' | 'center' | 'right' | 'justify' = 'right';
                    if (algn === 'ctr') align = 'center';
                    else if (algn === 'l') align = 'left';
                    else if (algn === 'just') align = 'justify';

                    const runs: SlideTextRun[] = [];
                    const rNodes = findByLocalName(pNode, 'r');

                    for (const rNode of rNodes) {
                      const tElem = findFirstByLocalName(rNode, 't');
                      const text = tElem?.textContent || '';
                      if (!text) continue;

                      textCollector.push(text);

                      const rPr = findFirstByLocalName(rNode, 'rPr');
                      const bold = rPr ? (rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true') : false;
                      const italic = rPr ? (rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true') : false;
                      const underline = rPr ? (rPr.getAttribute('u') === 'sng') : false;
                      const sz = rPr ? parseInt(rPr.getAttribute('sz') || '0', 10) : 0;
                      const fontSizePt = sz > 0 ? sz / 100 : undefined;
                      const color = resolveColor(rPr, themeColors);

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

                  if (paragraphs.length > 0 || shapeBg || borderColor) {
                    elements.push({
                      id: `sp-${slideNumber}-${cIdx}`,
                      type: 'shape',
                      left: tf.left,
                      top: tf.top,
                      width: tf.width,
                      height: tf.height,
                      rotation: tf.rotation,
                      flipH: tf.flipH,
                      flipV: tf.flipV,
                      zIndex,
                      geometry,
                      backgroundColor: shapeBg,
                      borderColor,
                      borderWidth,
                      borderStyle,
                      paragraphs
                    });
                  }
                }

                // B. Parse Pictures / Images: <p:pic>
                else if (nodeType === 'pic') {
                  const tf = extractTransform(child, slideCx, slideCy);
                  if (!tf) continue;

                  const blip = findFirstByLocalName(child, 'blip');
                  if (!blip) continue;

                  // Extract embed relationship id
                  let embedId: string | null = null;
                  for (let a = 0; a < blip.attributes.length; a++) {
                    const attr = blip.attributes[a];
                    if (attr.localName === 'embed' || attr.name === 'r:embed' || attr.name === 'embed') {
                      embedId = attr.value;
                      break;
                    }
                  }
                  if (!embedId) {
                    embedId = blip.getAttribute('r:embed') || blip.getAttribute('embed');
                  }

                  if (embedId && imageBlobUrls[embedId]) {
                    const { borderColor, borderWidth } = extractBorder(child);

                    elements.push({
                      id: `pic-${slideNumber}-${cIdx}`,
                      type: 'image',
                      left: tf.left,
                      top: tf.top,
                      width: tf.width,
                      height: tf.height,
                      rotation: tf.rotation,
                      flipH: tf.flipH,
                      flipV: tf.flipV,
                      zIndex,
                      imageUrl: imageBlobUrls[embedId],
                      borderColor,
                      borderWidth,
                      alt: `صورة شريحة ${slideNumber}`
                    });
                  }
                }

                // C. Parse Connection Lines / Arrows: <p:cxnSp>
                else if (nodeType === 'cxnSp') {
                  const tf = extractTransform(child, slideCx, slideCy);
                  if (!tf) continue;

                  // Extract line color from line or style/lnRef
                  let strokeColor: string | undefined = undefined;
                  const spPr = findFirstByLocalName(child, 'spPr');
                  if (spPr) {
                    const ln = findFirstByLocalName(spPr, 'ln');
                    if (ln) {
                      strokeColor = resolveColor(ln, themeColors);
                    }
                  }

                  if (!strokeColor) {
                    const style = findFirstByLocalName(child, 'style');
                    if (style) {
                      const lnRef = findFirstByLocalName(style, 'lnRef');
                      if (lnRef) {
                        strokeColor = resolveColor(lnRef, themeColors);
                      }
                    }
                  }

                  const ln = spPr ? findFirstByLocalName(spPr, 'ln') : null;
                  const wAttr = ln?.getAttribute('w');
                  const strokeWidth = wAttr ? Math.max(1.5, Math.round(parseInt(wAttr, 10) / 12700)) : 3;

                  // Check arrowheads
                  const headEnd = ln ? findFirstByLocalName(ln, 'headEnd') : null;
                  const tailEnd = ln ? findFirstByLocalName(ln, 'tailEnd') : null;
                  const headArrow = headEnd?.getAttribute('type') === 'triangle';
                  const tailArrow = tailEnd?.getAttribute('type') === 'triangle';

                  elements.push({
                    id: `cxn-${slideNumber}-${cIdx}`,
                    type: 'connector',
                    left: tf.left,
                    top: tf.top,
                    width: tf.width,
                    height: tf.height,
                    rotation: tf.rotation,
                    flipH: tf.flipH,
                    flipV: tf.flipV,
                    zIndex,
                    color: strokeColor || themeColors.accent1 || '#4f81bd',
                    strokeWidth,
                    headArrow,
                    tailArrow
                  });
                }

                // D. Parse Tables: <a:tbl> inside <p:graphicFrame>
                else if (nodeType === 'graphicFrame') {
                  const tf = extractTransform(child, slideCx, slideCy);
                  if (!tf) continue;

                  const tbl = findFirstByLocalName(child, 'tbl');
                  if (!tbl) continue;

                  const trNodes = findByLocalName(tbl, 'tr');
                  const tableRows: Array<Array<{ text: string; bg?: string }>> = [];

                  for (const tr of trNodes) {
                    const tcNodes = findByLocalName(tr, 'tc');
                    const rowCells: Array<{ text: string; bg?: string }> = [];

                    for (const tc of tcNodes) {
                      const tElems = findByLocalName(tc, 't');
                      const cellText = tElems.map(t => t.textContent || '').filter(Boolean).join(' ');
                      if (cellText) textCollector.push(cellText);
                      const tcPr = findFirstByLocalName(tc, 'tcPr');
                      const bg = tcPr ? resolveColor(tcPr, themeColors) : undefined;
                      rowCells.push({ text: cellText, bg });
                    }

                    if (rowCells.length > 0) {
                      tableRows.push(rowCells);
                    }
                  }

                  if (tableRows.length > 0) {
                    elements.push({
                      id: `tbl-${slideNumber}-${cIdx}`,
                      type: 'table',
                      left: tf.left,
                      top: tf.top,
                      width: tf.width,
                      height: tf.height,
                      rotation: tf.rotation,
                      flipH: tf.flipH,
                      flipV: tf.flipV,
                      zIndex,
                      rows: tableRows
                    });
                  }
                }
              }
            }
          }

          // Safety Fallback: Regex extraction in exact order if DOM elements were empty
          if (elements.length === 0) {
            const spTreeMatch = slideXmlStr.match(/<p:spTree>([\s\S]*?)<\/p:spTree>/);
            const spTreeContent = spTreeMatch ? spTreeMatch[1] : slideXmlStr;

            const elemRegex = /<p:(sp|pic|cxnSp)\b([\s\S]*?)<\/p:\1>/g;
            let m: RegExpExecArray | null;
            let elemIdx = 0;

            while ((m = elemRegex.exec(spTreeContent)) !== null) {
              const type = m[1];
              const inner = m[2];
              elemIdx++;

              const xM = inner.match(/<a:off\s+[^>]*x="(-?\d+)"\s+[^>]*y="(-?\d+)"/) || inner.match(/x="(-?\d+)"\s+y="(-?\d+)"/);
              const extM = inner.match(/<a:ext\s+[^>]*cx="(\d+)"\s+[^>]*cy="(\d+)"/) || inner.match(/cx="(\d+)"\s+cy="(\d+)"/);

              if (xM && extM) {
                const rawX = parseInt(xM[1], 10);
                const rawY = parseInt(xM[2], 10);
                const rawCx = parseInt(extM[1], 10);
                const rawCy = parseInt(extM[2], 10);
                const left = Math.max(0, Math.min(100, (rawX / slideCx) * 100));
                const top = Math.max(0, Math.min(100, (rawY / slideCy) * 100));
                const width = Math.max(0.5, Math.min(100, (rawCx / slideCx) * 100));
                const height = Math.max(0.5, Math.min(100, (rawCy / slideCy) * 100));

                const rotM = inner.match(/rot="(\d+)"/);
                const rotation = rotM ? parseInt(rotM[1], 10) / 60000 : undefined;
                const flipH = inner.includes('flipH="1"');
                const flipV = inner.includes('flipV="1"');

                if (type === 'pic') {
                  const embedM = inner.match(/r:embed="([^"]+)"/) || inner.match(/embed="([^"]+)"/);
                  if (embedM && imageBlobUrls[embedM[1]]) {
                    elements.push({
                      id: `fb-pic-${slideNumber}-${elemIdx}`,
                      type: 'image',
                      left,
                      top,
                      width,
                      height,
                      rotation,
                      flipH,
                      flipV,
                      zIndex: elemIdx,
                      imageUrl: imageBlobUrls[embedM[1]],
                      alt: `صورة شريحة ${slideNumber}`
                    });
                  }
                } else if (type === 'cxnSp') {
                  const clrM = inner.match(/val="([^"]+)"/);
                  const clrVal = clrM ? clrM[1] : undefined;
                  const color = clrVal ? (themeColors[clrVal] || (clrVal.length === 6 ? `#${clrVal}` : undefined)) : themeColors.accent1;

                  elements.push({
                    id: `fb-cxn-${slideNumber}-${elemIdx}`,
                    type: 'connector',
                    left,
                    top,
                    width,
                    height,
                    rotation,
                    flipH,
                    flipV,
                    zIndex: elemIdx,
                    color: color || '#4f81bd',
                    strokeWidth: 3
                  });
                } else if (type === 'sp') {
                  const tMatches = [...inner.matchAll(/<a:t>([^<]+)<\/a:t>/g)].map(t => t[1]);
                  const clrM = inner.match(/<a:solidFill>[\s\S]*?val="([^"]+)"/);
                  const bgVal = clrM ? clrM[1] : undefined;
                  const backgroundColor = bgVal ? (themeColors[bgVal] || (bgVal.length === 6 ? `#${bgVal}` : undefined)) : undefined;

                  if (tMatches.length > 0 || backgroundColor) {
                    tMatches.forEach(t => textCollector.push(t));
                    elements.push({
                      id: `fb-sp-${slideNumber}-${elemIdx}`,
                      type: 'shape',
                      left,
                      top,
                      width,
                      height,
                      rotation,
                      flipH,
                      flipV,
                      zIndex: elemIdx,
                      backgroundColor,
                      paragraphs: [
                        {
                          align: 'right',
                          runs: tMatches.map(t => ({ text: t, bold: true, fontSizePt: 15 }))
                        }
                      ]
                    });
                  }
                }
              }
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
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/95 border-b border-slate-800 text-xs shrink-0 z-20">
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
      <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950 min-h-[350px]">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xs p-6 text-center text-white">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
            <h4 className="text-sm font-bold text-slate-100 mb-1">جارٍ استخراج وتجهيز شرائح PowerPoint</h4>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{loadingProgress}</p>
          </div>
        )}

        {/* Error Fallback State */}
        {!loading && (error || slides.length === 0) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">تعذر استعراض شرائح PowerPoint مباشرة في المشغل</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              {error || 'لم يتم العثور على شرائح قابلة للعرض داخل هذا الملف.'}
              <br />
              <span className="text-slate-300 font-semibold">الملف محفوظ بأمان ومتاح للتحميل الفوري أو المعاينة المباشرة عبر الروابط التالية:</span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف PowerPoint (.pptx)</span>
                </button>
              )}

              {url && url.startsWith('http') && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
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
                  className="px-4 py-2.5 rounded-xl bg-sky-900/60 hover:bg-sky-800/80 text-sky-200 font-bold text-xs flex items-center gap-2 border border-sky-700/50 cursor-pointer transition-all"
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
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto bg-slate-950 w-full min-h-[350px]">
            <div
              className="relative w-full max-w-4xl flex items-center justify-center transition-transform duration-200 ease-out origin-center my-auto"
              style={{
                transform: zoom !== 1.0 ? `scale(${zoom})` : undefined
              }}
            >
              {/* Slide Canvas with guaranteed width & aspect ratio */}
              <div
                className="relative w-full bg-white text-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-700/80 select-text"
                style={{
                  aspectRatio: `${aspectRatio}`,
                  minHeight: '320px',
                  backgroundColor: currentSlide.backgroundColor || '#ffffff'
                }}
              >
                {/* Render Slide Elements in exact Z-order */}
                {currentSlide.elements.map(elem => {
                  // A. Render Shape / Textbox
                  if (elem.type === 'shape') {
                    let roundedClass = 'rounded-none';
                    if (elem.geometry === 'roundRect') roundedClass = 'rounded-xl sm:rounded-2xl';
                    else if (elem.geometry === 'ellipse') roundedClass = 'rounded-full';
                    else if (elem.geometry === 'rect') roundedClass = 'rounded-sm';

                    const transformParts: string[] = [];
                    if (elem.rotation) transformParts.push(`rotate(${elem.rotation}deg)`);
                    if (elem.flipH) transformParts.push('scaleX(-1)');
                    if (elem.flipV) transformParts.push('scaleY(-1)');

                    return (
                      <div
                        key={elem.id}
                        className={`absolute flex flex-col justify-center overflow-hidden p-1 sm:p-1.5 leading-snug ${roundedClass}`}
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          backgroundColor: elem.backgroundColor || 'transparent',
                          border: elem.borderColor ? `${elem.borderWidth || 1}px ${elem.borderStyle || 'solid'} ${elem.borderColor}` : undefined,
                          zIndex: elem.zIndex,
                          transform: transformParts.length > 0 ? transformParts.join(' ') : undefined
                        }}
                      >
                        {elem.paragraphs.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="w-full my-0.5 leading-relaxed"
                            style={{ textAlign: p.align || 'right' }}
                            dir="rtl"
                          >
                            {p.runs.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                style={{
                                  fontWeight: r.bold ? 'bold' : 'normal',
                                  fontStyle: r.italic ? 'italic' : 'normal',
                                  textDecoration: r.underline ? 'underline' : 'none',
                                  color: r.color || (elem.backgroundColor ? '#0f172a' : 'inherit'),
                                  fontSize: r.fontSizePt
                                    ? `clamp(11px, ${(r.fontSizePt / 22).toFixed(2)}rem, 36px)`
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

                  // B. Render Picture / Image
                  if (elem.type === 'image') {
                    const transformParts: string[] = [];
                    if (elem.rotation) transformParts.push(`rotate(${elem.rotation}deg)`);
                    if (elem.flipH) transformParts.push('scaleX(-1)');
                    if (elem.flipV) transformParts.push('scaleY(-1)');

                    return (
                      <div
                        key={elem.id}
                        className="absolute overflow-hidden flex items-center justify-center pointer-events-none select-none"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          zIndex: elem.zIndex,
                          border: elem.borderColor ? `${elem.borderWidth || 1}px solid ${elem.borderColor}` : undefined,
                          transform: transformParts.length > 0 ? transformParts.join(' ') : undefined
                        }}
                      >
                        <img
                          src={elem.imageUrl}
                          alt={elem.alt || 'صورة الشريحة'}
                          className="w-full h-full object-fill pointer-events-none select-none"
                          loading="lazy"
                        />
                      </div>
                    );
                  }

                  // C. Render Connector Line / Arrow
                  if (elem.type === 'connector') {
                    // Line direction based on flipH and flipV
                    const x1 = elem.flipH ? 100 : 0;
                    const y1 = elem.flipV ? 100 : 0;
                    const x2 = elem.flipH ? 0 : 100;
                    const y2 = elem.flipV ? 0 : 100;
                    const strokeColor = elem.color || '#4f81bd';
                    const strokeWidth = elem.strokeWidth || 3;

                    return (
                      <div
                        key={elem.id}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          zIndex: elem.zIndex,
                          transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined
                        }}
                      >
                        <svg
                          className="w-full h-full overflow-visible"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <marker
                              id={`arrow-${elem.id}`}
                              viewBox="0 0 10 10"
                              refX="6"
                              refY="5"
                              markerWidth="6"
                              markerHeight="6"
                              orient="auto-start-reverse"
                            >
                              <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
                            </marker>
                          </defs>
                          <line
                            x1={`${x1}%`}
                            y1={`${y1}%`}
                            x2={`${x2}%`}
                            y2={`${y2}%`}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            markerEnd={elem.headArrow ? `url(#arrow-${elem.id})` : undefined}
                          />
                        </svg>
                      </div>
                    );
                  }

                  // D. Render Table
                  if (elem.type === 'table') {
                    const transformParts: string[] = [];
                    if (elem.rotation) transformParts.push(`rotate(${elem.rotation}deg)`);
                    if (elem.flipH) transformParts.push('scaleX(-1)');
                    if (elem.flipV) transformParts.push('scaleY(-1)');

                    return (
                      <div
                        key={elem.id}
                        className="absolute overflow-auto border border-slate-300 rounded"
                        style={{
                          left: `${elem.left}%`,
                          top: `${elem.top}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          zIndex: elem.zIndex,
                          transform: transformParts.length > 0 ? transformParts.join(' ') : undefined
                        }}
                      >
                        <table className="w-full h-full text-xs text-right border-collapse bg-white/95">
                          <tbody>
                            {elem.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-200">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="p-1 border-l border-slate-200 text-slate-800"
                                    style={{ backgroundColor: cell.bg }}
                                  >
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
                    <FileQuestion className="w-12 h-12 mb-2 opacity-50" />
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
              <span className="text-amber-400 font-mono">{slides.length}</span>
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
