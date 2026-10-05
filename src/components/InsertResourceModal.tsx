import React, { useState, useEffect, useId } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import { GRADES, SUBJECTS } from '../data/initialData';
import { ResourceItem, SupportingFile, PreviewType } from '../types';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Save,
  Send,
  Plus,
  Trash2,
  Package,
  FileText,
  FileArchive,
  Image as ImageIcon,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Layers,
  FileCheck,
  Download,
  Lock,
  Clock,
  BookOpen,
  Award,
  Maximize2,
  Loader2
} from 'lucide-react';

interface InsertResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceToEdit?: ResourceItem | null;
}

// Maximum allowed ZIP package size: 50MB
const MAX_PACKAGE_SIZE = 50 * 1024 * 1024;

// Allowed safe educational web resource extensions inside interactive packages
const ALLOWED_PACKAGE_EXTENSIONS = [
  '.html', '.htm', '.css', '.js', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.mp4', '.webm', '.ogv',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.txt', '.csv', '.xml', '.md'
];

export const InsertResourceModal: React.FC<InsertResourceModalProps> = ({
  isOpen,
  onClose,
  resourceToEdit
}) => {
  const { user } = useAuth();
  const {
    createResource,
    updateResource,
    resourceTypes,
    curricula,
    units,
    topics,
    grades,
    subjects,
    findPotentialDuplicates,
    showToast
  } = useResources();

  const effectiveGrades = grades && grades.length > 0 ? grades.filter(g => g.isActive !== false) : GRADES;
  const effectiveSubjects = subjects && subjects.length > 0 ? subjects.filter(s => s.isActive !== false) : SUBJECTS;

  const fileInputId = useId();
  const coverImageInputId = useId();
  const supportingFileInputId = useId();

  // Multi-step Wizard State: 1 = بيانات المورد, 2 = ملفات المورد, 3 = إعدادات المورد, 4 = مراجعة قبل الإرسال
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: بيانات المورد
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [gradeId, setGradeId] = useState('grade-10');
  const [subjectId, setSubjectId] = useState('chemistry');
  const [curriculum, setCurriculum] = useState('سلطنة عمان - كامبريدج');
  const [unit, setUnit] = useState('');
  const [topic, setTopic] = useState('');
  const [resourceType, setResourceType] = useState('محاكاة');
  const [category, setCategory] = useState('تجربة واستقصاء علمي');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['علوم', 'تفاعلي']);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [educationalObjectives, setEducationalObjectives] = useState<string[]>([]);
  const [conceptInput, setConceptInput] = useState('');
  const [scientificConcepts, setScientificConcepts] = useState<string[]>([]);

  // STEP 2: ملفات المورد
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [supportingFiles, setSupportingFiles] = useState<SupportingFile[]>([]);
  const [newSuppFileName, setNewSuppFileName] = useState('');
  const [newSuppFileUrl, setNewSuppFileUrl] = useState('');

  // Upload & Validation States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isZipValidated, setIsZipValidated] = useState(false);
  const [zipValidationDetails, setZipValidationDetails] = useState<{
    fileCount: number;
    hasCss: boolean;
    hasJs: boolean;
    hasImages: boolean;
  } | null>(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Interactive Preview in modal
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Duplicate resource detection state (Requirement #9)
  const [potentialDuplicates, setPotentialDuplicates] = useState<ResourceItem[]>([]);

  useEffect(() => {
    if (!resourceToEdit && title.trim().length >= 4) {
      const dups = findPotentialDuplicates(title.trim(), fileName, fileSize);
      setPotentialDuplicates(dups);
    } else {
      setPotentialDuplicates([]);
    }
  }, [title, fileName, fileSize, resourceToEdit, findPotentialDuplicates]);

  // STEP 3: إعدادات المورد
  const [version, setVersion] = useState('الإصدار 1.0');
  const [usageRights, setUsageRights] = useState('جميع الحقوق محفوظة لمدرسة محلاح للبنات (5–12)');
  const [targetStatus, setTargetStatus] = useState<'draft' | 'submitted'>('submitted');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);
  const [usageContext, setUsageContext] = useState('استخدام مخبري وتطبيقي');
  const [executionTime, setExecutionTime] = useState('45 دقيقة (حصة دراسية)');

  // Load existing data if editing
  useEffect(() => {
    if (resourceToEdit) {
      setTitle(resourceToEdit.title);
      setAuthor(resourceToEdit.authorName || user?.displayName || '');
      setDescription(resourceToEdit.description);
      setGradeId(resourceToEdit.gradeId);
      setSubjectId(resourceToEdit.subjectId);
      setCurriculum(resourceToEdit.curriculum || 'سلطنة عمان - كامبريدج');
      setUnit(resourceToEdit.unit || '');
      setTopic(resourceToEdit.topic || '');
      setResourceType(resourceToEdit.resourceType);
      setCategory(resourceToEdit.category || 'تجربة واستقصاء علمي');
      setTags(resourceToEdit.tags || []);
      setEducationalObjectives(resourceToEdit.educationalObjectives || []);
      setScientificConcepts(resourceToEdit.scientificConcepts || []);
      setThumbnailUrl(resourceToEdit.thumbnailUrl);
      setHtmlContent(resourceToEdit.htmlContent || '');
      setFileName(resourceToEdit.fileName || '');
      setFileSize(resourceToEdit.fileSize || '');
      setFileType(resourceToEdit.fileType || '');
      setSupportingFiles(resourceToEdit.supportingFiles || []);
      setVersion(resourceToEdit.version || 'الإصدار 1.0');
      setUsageRights(resourceToEdit.usageRights || 'جميع الحقوق محفوظة لمدرسة محلاح للبنات (5–12)');
      setAllowDownload(resourceToEdit.allowDownload ?? true);
      setAllowPreview(resourceToEdit.allowPreview ?? true);
      setUsageContext(resourceToEdit.usageContext || 'استخدام مخبري وتطبيقي');
      setExecutionTime(resourceToEdit.executionTime || '45 دقيقة (حصة دراسية)');
      setTargetStatus(resourceToEdit.status === 'draft' ? 'draft' : 'submitted');
      setCurrentStep(1);
      setValidationError('');
    } else {
      // Reset form to defaults
      setTitle('');
      setAuthor(user?.displayName || '');
      setDescription('');
      setGradeId('grade-10');
      setSubjectId('chemistry');
      setCurriculum('سلطنة عمان - كامبريدج');
      setUnit('');
      setTopic('');
      setResourceType('محاكاة');
      setCategory('تجربة واستقصاء علمي');
      setTags(['علوم', 'تفاعلي']);
      setEducationalObjectives([]);
      setScientificConcepts([]);
      setThumbnailUrl('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80');
      setHtmlContent('');
      setFileName('');
      setFileSize('');
      setFileType('');
      setSupportingFiles([]);
      setIsZipValidated(false);
      setZipValidationDetails(null);
      setValidationError('');
      setVersion('الإصدار 1.0');
      setUsageRights('جميع الحقوق محفوظة لمدرسة محلاح للبنات (5–12)');
      setAllowDownload(true);
      setAllowPreview(true);
      setUsageContext('استخدام مخبري وتطبيقي');
      setExecutionTime('45 دقيقة (حصة دراسية)');
      setTargetStatus('submitted');
      setCurrentStep(1);
    }
  }, [resourceToEdit, isOpen]);

  if (!isOpen) return null;

  // Filter valid subjects for selected grade
  const validSubjects = SUBJECTS.filter(s => s.grades.includes(gradeId));

  const handleGradeChange = (newGradeId: string) => {
    setGradeId(newGradeId);
    const sub = SUBJECTS.filter(s => s.grades.includes(newGradeId));
    if (sub.length > 0 && !sub.some(s => s.id === subjectId)) {
      setSubjectId(sub[0].id);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddObjective = () => {
    if (objectiveInput.trim() && !educationalObjectives.includes(objectiveInput.trim())) {
      setEducationalObjectives([...educationalObjectives, objectiveInput.trim()]);
      setObjectiveInput('');
    }
  };

  const handleRemoveObjective = (idx: number) => {
    setEducationalObjectives(educationalObjectives.filter((_, i) => i !== idx));
  };

  const handleAddConcept = () => {
    if (conceptInput.trim() && !scientificConcepts.includes(conceptInput.trim())) {
      setScientificConcepts([...scientificConcepts, conceptInput.trim()]);
      setConceptInput('');
    }
  };

  const handleRemoveConcept = (idx: number) => {
    setScientificConcepts(scientificConcepts.filter((_, i) => i !== idx));
  };

  const handleAddSupportingFile = () => {
    if (!newSuppFileName.trim()) return;
    setSupportingFiles([
      ...supportingFiles,
      {
        name: newSuppFileName.trim(),
        url: newSuppFileUrl.trim() || '#',
        size: '1.2 MB',
        type: 'ملف مساند'
      }
    ]);
    setNewSuppFileName('');
    setNewSuppFileUrl('');
  };

  const handleRemoveSupportingFile = (idx: number) => {
    setSupportingFiles(supportingFiles.filter((_, i) => i !== idx));
  };

  // Cover image file upload handler (converts to base64 Data URL)
  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setThumbnailUrl(reader.result);
        showToast('تم رفع صورة الغلاف بنجاح', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * ZIP and File Validation Engine
   * Validates:
   * 1. File size (Max 50MB) -> "حجم الحزمة يتجاوز الحد المسموح."
   * 2. ZIP integrity with JSZip -> "الحزمة غير صالحة."
   * 3. Presence of index.html -> "لم يتم العثور على ملف index.html."
   * 4. Suspicious/dangerous extensions -> "تحتوي الحزمة على ملف غير مسموح."
   * 5. Path traversal attempts (`..` or leading `/`) -> "تحتوي الحزمة على ملف غير مسموح."
   * 6. General verification fallback -> "تعذر التحقق من الحزمة."
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError('');
    setIsZipValidated(false);
    setZipValidationDetails(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    // 1. Check file size
    if (file.size > MAX_PACKAGE_SIZE) {
      setValidationError('حجم الحزمة يتجاوز الحد المسموح. (الحد الأقصى المسموح به هو 50 ميجابايت)');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setFileType(ext);
    setIsUploading(true);
    setUploadProgress(15);

    try {
      if (ext === '.zip') {
        setUploadProgress(30);

        // 2. Test ZIP Integrity
        let zip: JSZip;
        try {
          zip = await JSZip.loadAsync(file);
        } catch {
          setIsUploading(false);
          setValidationError('الحزمة غير صالحة. تعذر فك تشفير وفهرسة ملف ZIP.');
          return;
        }

        setUploadProgress(50);

        // 3. Security Audit: Check all file paths inside ZIP for path traversal and disallowed extensions
        const fileNames = Object.keys(zip.files);
        let foundExecutableOrDangerous = false;
        let foundPathTraversal = false;
        let foundDisallowedFile = false;

        for (const filePath of fileNames) {
          const zipEntry = zip.files[filePath];
          if (zipEntry.dir) continue;

          // Check path traversal
          if (filePath.includes('../') || filePath.includes('..\\') || filePath.startsWith('/') || filePath.startsWith('\\')) {
            foundPathTraversal = true;
            break;
          }

          // Check against allowed safe extensions (ignoring harmless OS metadata like __MACOSX, .DS_Store)
          const lowerPath = filePath.toLowerCase();
          const fileExt = '.' + lowerPath.split('.').pop();
          if (!filePath.startsWith('__MACOSX') && !filePath.endsWith('.DS_Store')) {
            if (!ALLOWED_PACKAGE_EXTENSIONS.includes(fileExt)) {
              foundDisallowedFile = true;
              break;
            }
          }
        }

        if (foundPathTraversal || foundDisallowedFile) {
          setIsUploading(false);
          setValidationError('تحتوي الحزمة على ملف غير مسموح أو مسار غير آمن. تم حظر الحزمة لحماية أمان المنصة.');
          return;
        }

        setUploadProgress(70);

        // 4. Check Presence of index.html
        let indexFile = zip.file('index.html');
        if (!indexFile) {
          // Look in first-level directory
          const match = fileNames.find(n => n.endsWith('index.html') && !n.startsWith('__MACOSX'));
          if (match) {
            indexFile = zip.file(match);
          }
        }

        if (!indexFile) {
          setIsUploading(false);
          setValidationError('لم يتم العثور على ملف index.html. يجب أن تحتوي الحزمة التفاعلية على ملف index.html رئيسي.');
          return;
        }

        setUploadProgress(85);

        // Extract HTML content
        let htmlText = await indexFile.async('text');

        // Extract and bundle CSS files into <style> tags
        const styleEntries = fileNames.filter(n => n.endsWith('.css') && !n.startsWith('__MACOSX'));
        let bundledCss = '';
        for (const sPath of styleEntries) {
          const sFile = zip.file(sPath);
          if (sFile) {
            const css = await sFile.async('text');
            bundledCss += `\n/* ${sPath} */\n` + css;
          }
        }
        if (bundledCss) {
          if (htmlText.includes('</head>')) {
            htmlText = htmlText.replace('</head>', `<style>\n${bundledCss}\n</style></head>`);
          } else {
            htmlText = `<style>\n${bundledCss}\n</style>` + htmlText;
          }
        }

        // Extract and bundle JS files into <script> tags
        const scriptEntries = fileNames.filter(n => n.endsWith('.js') && !n.startsWith('__MACOSX'));
        let bundledJs = '';
        for (const jPath of scriptEntries) {
          const jFile = zip.file(jPath);
          if (jFile) {
            const js = await jFile.async('text');
            bundledJs += `\n// ${jPath}\n` + js;
          }
        }
        if (bundledJs) {
          if (htmlText.includes('</body>')) {
            htmlText = htmlText.replace('</body>', `<script>\n${bundledJs}\n</script></body>`);
          } else {
            htmlText = htmlText + `<script>\n${bundledJs}\n</script>`;
          }
        }

        // Extract images and convert to base64 Data URLs so relative paths resolve cleanly
        const imageEntries = fileNames.filter(n => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(n) && !n.startsWith('__MACOSX'));
        for (const imgPath of imageEntries) {
          const imgFile = zip.file(imgPath);
          if (imgFile) {
            const ext = imgPath.split('.').pop()?.toLowerCase();
            const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
            const base64 = await imgFile.async('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            // Replace exact path and relative ./ path in html
            const cleanPath = imgPath.replace(/^\.\//, '');
            htmlText = htmlText.split(cleanPath).join(dataUrl);
            htmlText = htmlText.split('./' + cleanPath).join(dataUrl);
          }
        }

        // Ensure Arabic RTL meta
        if (!htmlText.includes('dir="rtl"') && !htmlText.includes("dir='rtl'")) {
          htmlText = htmlText.replace('<html', '<html dir="rtl" lang="ar"');
        }

        setHtmlContent(htmlText);
        setIsZipValidated(true);
        setResourceType('حزمة HTML تفاعلية');
        setZipValidationDetails({
          fileCount: fileNames.length,
          hasCss: styleEntries.length > 0,
          hasJs: scriptEntries.length > 0,
          hasImages: imageEntries.length > 0
        });

        setUploadProgress(100);
        setIsUploading(false);
        showToast('تم التحقق من حزمة ZIP بنجاح وجاهزة للمعاينة التفاعلية', 'success');

      } else if (ext === '.html' || ext === '.htm') {
        setUploadProgress(70);
        let text = await file.text();
        if (!text.includes('dir="rtl"') && !text.includes("dir='rtl'")) {
          text = text.replace('<html', '<html dir="rtl" lang="ar"');
        }
        setHtmlContent(text);
        setFileName(file.name);
        setFileType('.html');
        setResourceType('محاكاة تفاعلية');
        setIsZipValidated(true);
        setUploadProgress(100);
        setIsUploading(false);
        showToast('تم تحميل صفحة المحاكاة HTML بنجاح وجاهزة للعرض التفاعلي', 'success');

      } else {
        // Other files like PDF, PPTX, DOCX, MP4, etc.
        setUploadProgress(100);
        setIsUploading(false);
        if (ext === '.pdf') setResourceType('ملف PDF');
        else if (ext === '.pptx' || ext === '.ppt') setResourceType('عرض تقديمي');
        else if (ext === '.docx' || ext === '.doc') setResourceType('ملف Word');
        else if (ext === '.mp4') setResourceType('فيديو تعليمي');
        else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') setResourceType('صورة تعليمية');
        showToast(`تم رفع الملف (${file.name}) بنجاح`, 'success');
      }
    } catch (err) {
      setIsUploading(false);
      setValidationError('تعذر التحقق من الحزمة. يرجى مراجعة هيكل الملف والمحاولة مجدداً.');
      console.error(err);
    }
  };

  /**
   * Generator for standard valid interactive ZIP test package
   */
  const handleLoadDemoZip = async () => {
    setIsUploading(true);
    setValidationError('');
    setUploadProgress(25);
    try {
      const zip = new JSZip();

      const htmlContentDemo = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>مختبر الدوائر الكهربائية وقانون أوم التفاعلي</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="circuit-container">
    <div class="badge">مدرسة محلاح للبنات (5–12) • مختبر الفيزياء التفاعلي</div>
    <h2>⚡ محاكاة قانون أوم والدوائر الكهربائية</h2>
    <p>قم بتغيير فرق الجهد والمقاومة لملاحظة شدة التيار وتوهج المصباح وفق العلاقة: I = V / R</p>
    
    <div class="controls">
      <div class="control-box">
        <label>فرق الجهد (V): <span id="vVal">12</span> فولت</label>
        <input type="range" id="vRange" min="1" max="24" value="12" oninput="calc()">
      </div>
      <div class="control-box">
        <label>المقاومة (R): <span id="rVal">6</span> أوم</label>
        <input type="range" id="rRange" min="1" max="20" value="6" oninput="calc()">
      </div>
    </div>

    <div class="bulb-display">
      <div id="bulb" class="bulb on">💡</div>
      <div id="readout" class="readout">شدة التيار: 2.00 أمبير</div>
    </div>

    <button onclick="toggleSwitch()" id="switchBtn" class="btn">فتح / غلق المفتاح</button>
  </div>
  <script src="script.js"></script>
</body>
</html>`;

      const cssDemo = `
        body { font-family: 'Cairo', system-ui, sans-serif; background: #0f172a; color: white; text-align: center; padding: 20px; direction: rtl; }
        .circuit-container { max-width: 580px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 20px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .badge { display: inline-block; font-size: 11px; background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; font-weight: bold; }
        h2 { color: #38bdf8; margin-bottom: 8px; font-size: 18px; }
        p { color: #94a3b8; font-size: 13px; margin-bottom: 20px; line-height: 1.5; }
        .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .control-box { background: #0f172a; padding: 12px; border-radius: 12px; border: 1px solid #334155; }
        label { display: block; font-size: 12px; margin-bottom: 6px; color: #38bdf8; font-weight: bold; }
        input[type=range] { width: 100%; accent-color: #38bdf8; cursor: pointer; }
        .bulb-display { margin: 20px 0; background: #0f172a/60; padding: 16px; border-radius: 16px; }
        .bulb { font-size: 56px; transition: all 0.3s ease; }
        .bulb.on { filter: drop-shadow(0 0 25px #facc15); transform: scale(1.1); }
        .bulb.off { filter: grayscale(1) opacity(0.3); transform: scale(0.95); }
        .readout { font-size: 16px; font-weight: bold; color: #4ade80; margin-top: 10px; font-family: monospace; }
        .btn { background: #0284c7; hover:background: #0369a1; color: white; border: none; padding: 10px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn:hover { background: #0369a1; }
      `;

      const jsDemo = `
        let isClosed = true;
        function calc() {
          if (!isClosed) return;
          const v = parseFloat(document.getElementById('vRange').value);
          const r = parseFloat(document.getElementById('rRange').value);
          document.getElementById('vVal').innerText = v;
          document.getElementById('rVal').innerText = r;
          const i = v / r;
          document.getElementById('readout').innerText = 'شدة التيار I = ' + i.toFixed(2) + ' أمبير';
          const bulb = document.getElementById('bulb');
          bulb.className = 'bulb on';
          bulb.style.filter = 'drop-shadow(0 0 ' + Math.min(50, i * 15) + 'px #facc15)';
        }
        function toggleSwitch() {
          isClosed = !isClosed;
          const bulb = document.getElementById('bulb');
          const readout = document.getElementById('readout');
          const btn = document.getElementById('switchBtn');
          if (isClosed) {
            btn.innerText = 'فتح المفتاح';
            calc();
          } else {
            btn.innerText = 'غلق المفتاح';
            bulb.className = 'bulb off';
            bulb.style.filter = 'none';
            readout.innerText = 'الدائرة مفتوحة - التيار: 0 أمبير';
          }
        }
        calc();
      `;

      zip.file('index.html', htmlContentDemo);
      zip.file('style.css', cssDemo);
      zip.file('script.js', jsDemo);

      const combinedHtml = htmlContentDemo
        .replace('<link rel="stylesheet" href="style.css">', `<style>\n${cssDemo}\n</style>`)
        .replace('<script src="script.js"></script>', `<script>\n${jsDemo}\n</script>`);

      setTitle('محاكاة الدوائر الكهربائية وقانون أوم');
      setDescription('حزمة تفاعلية لاختبار العلاقة بين الجهد والتيار والمقاومة مع إمكانية فتح وغلق المفتاح وملاحظة توهج المصباح.');
      setGradeId('grade-9');
      setSubjectId('physics');
      setResourceType('حزمة HTML تفاعلية');
      setCategory('محاكاة ومختبر افتراضي');
      setUnit('الوحدة الثالثة: الكهرباء والمغناطيسية');
      setTopic('قانون أوم والدوائر البسيطة');
      setTags(['فيزياء', 'قانون أوم', 'دوائر كهربائية', 'حزمة تفاعلية']);
      setEducationalObjectives([
        'استنتاج العلاقة الرياضية لقانون أوم (I = V / R).',
        'ملاحظة أثر تغيير المقاومة وفرق الجهد على توهج المصباح.'
      ]);
      setScientificConcepts(['فرق الجهد', 'المقاومة الكهربائية', 'شدة التيار']);
      setFileName('circuit_lab_package.zip');
      setFileSize('14.2 KB');
      setFileType('.zip');
      setHtmlContent(combinedHtml);
      setIsZipValidated(true);
      setZipValidationDetails({
        fileCount: 3,
        hasCss: true,
        hasJs: true,
        hasImages: false
      });
      setIsUploading(false);
      showToast('تم توليد وفحص حزمة ZIP النموذجية بنجاح!', 'success');
    } catch (e) {
      setIsUploading(false);
      console.error(e);
    }
  };

  /**
   * Step validation before proceeding
   */
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        setValidationError('يرجى إدخال عنوان المورد.');
        return;
      }
      if (!description.trim()) {
        setValidationError('يرجى إدخال وصف المورد.');
        return;
      }
      if (!gradeId) {
        setValidationError('يرجى اختيار الصف الدراسي.');
        return;
      }
      if (!subjectId) {
        setValidationError('يرجى تحديد المادة العلمية.');
        return;
      }
      setValidationError('');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setValidationError('');
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setValidationError('');
      setCurrentStep(4);
    }
  };

  /**
   * Final Submission / Save
   */
  const handleSave = async (finalStatus: 'draft' | 'submitted') => {
    // Validation
    if (!title.trim()) {
      setValidationError('يرجى إدخال عنوان المورد.');
      setCurrentStep(1);
      return;
    }
    if (!description.trim()) {
      setValidationError('يرجى إدخال وصف المورد.');
      setCurrentStep(1);
      return;
    }
    if (!gradeId) {
      setValidationError('يرجى اختيار الصف الدراسي.');
      setCurrentStep(1);
      return;
    }
    if (!subjectId) {
      setValidationError('يرجى تحديد المادة العلمية.');
      setCurrentStep(1);
      return;
    }

    const selectedGrade = effectiveGrades.find(g => g.id === gradeId);
    const selectedSubject = effectiveSubjects.find(s => s.id === subjectId);
    const matchedCurric = curricula.find(c => c.name === curriculum || c.id === resourceToEdit?.curriculumId);
    const matchedUnit = units.find(u => u.name === unit.trim());
    const matchedTopic = topics.find(t => t.name === topic.trim());
    const matchedType = resourceTypes.find(t => t.name === resourceType);

    const authorName = author.trim() || resourceToEdit?.authorName || user?.displayName || 'عضو هيئة التدريس';
    const authorId = resourceToEdit?.authorId || user?.id || 'guest-author';

    const finalHtml = htmlContent || undefined;
    const finalFileUrl = finalHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}` : (resourceToEdit?.fileUrl || undefined);

    const resourceDataRecord = {
      title: title.trim(),
      authorName,
      authorId,
      description: description.trim(),
      gradeId,
      gradeName: selectedGrade?.name || 'الصف العاشر',
      subjectId,
      subjectName: selectedSubject?.name || 'الكيمياء',
      curriculum,
      curriculumId: matchedCurric?.id || resourceToEdit?.curriculumId,
      unit: unit.trim() || 'الوحدة التعليمية العامة',
      unitId: matchedUnit?.id || resourceToEdit?.unitId,
      topic: topic.trim() || title.trim(),
      topicId: matchedTopic?.id || resourceToEdit?.topicId,
      resourceType,
      type: resourceType,
      resourceTypeId: matchedType?.id || resourceToEdit?.resourceTypeId,
      category,
      pedagogicalCategory: category,
      tags,
      educationalObjectives,
      scientificConcepts,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80',
      fileName: fileName || `${title}.html`,
      fileSize: fileSize || '1.0 MB',
      fileType: fileType || (finalHtml ? '.html' : undefined),
      fileUrl: finalFileUrl,
      file_url: finalFileUrl,
      htmlContent: finalHtml,
      html_content: finalHtml,
      supportingFiles,
      version,
      usageRights,
      allowDownload,
      allowPreview,
      usageContext,
      executionTime,
      previewType: ((finalHtml || resourceType.includes('محاكاة') || fileType === '.html' || resourceType.includes('تفاعلي') || resourceType.toLowerCase().includes('simulation')) ? 'html' : 'document') as PreviewType
    };

    if (resourceToEdit) {
      updateResource(resourceToEdit.id, {
        ...resourceDataRecord,
        status: finalStatus === 'submitted' ? 'submitted' : (resourceToEdit.status === 'needs_revision' ? 'needs_revision' : finalStatus),
        updatedAt: new Date().toISOString()
      });
      onClose();
    } else {
      setIsSubmitting(true);
      try {
        const saved = await createResource({
          ...resourceDataRecord,
          authorId,
          authorName,
          status: finalStatus
        });
        if (saved) {
          onClose();
        } else {
          setValidationError('تعذر حفظ المورد في قاعدة البيانات Supabase. يرجى مراجعة الصلاحيات أو التأكد من تسجيل الدخول كمدير معتمد.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setValidationError(`حدث خطأ أثناء الحفظ في Supabase: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {resourceToEdit ? 'تعديل بيانات المورد التعليمي' : 'إدراج مورد تعليمي جديد'}
              </h3>
              <p className="text-xs text-slate-500">
                مكتبة العلوم الرقمية • مدرسة محلاح للبنات (5–12)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step Wizard Navigation Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : currentStep > 1
                  ? 'bg-sky-100 text-sky-800 font-semibold'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>1. <span className="hidden sm:inline">بيانات</span> المورد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim() && description.trim()) setCurrentStep(2);
                else setValidationError('يرجى ملء عنوان ووصف المورد أولاً.');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                currentStep === 2
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : currentStep > 2
                  ? 'bg-sky-100 text-sky-800 font-semibold'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0" />
              <span>2. <span className="hidden sm:inline">ملفات</span> المورد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim() && description.trim()) setCurrentStep(3);
                else setValidationError('يرجى ملء عنوان ووصف المورد أولاً.');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                currentStep === 3
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : currentStep > 3
                  ? 'bg-sky-100 text-sky-800 font-semibold'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>3. <span className="hidden sm:inline">إعدادات</span> المورد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim() && description.trim()) setCurrentStep(4);
                else setValidationError('يرجى ملء عنوان ووصف المورد أولاً.');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl transition-all cursor-pointer ${
                currentStep === 4
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 shrink-0" />
              <span>4. <span className="hidden sm:inline">مراجعة</span> الإرسال</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
          
          {/* Error Message Alert */}
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{validationError}</span>
            </div>
          )}

          {/* ========================================================
              STEP 1: بيانات المورد
             ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* Quick Preset Buttons for Testing */}
              {!resourceToEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 block">🧪 اختبار المكتبة الرقمية (E2E)</span>
                      <span className="text-[11px] text-emerald-700">الصف العاشر - الكيمياء - محاكاة تفاعلية</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle('اختبار المكتبة الرقمية');
                        setDescription('مورد تجريبي للتحقق من دورة إدراج ومراجعة ونشر الموارد في منصة مكتبة العلوم الرقمية.');
                        setGradeId('grade-10');
                        setSubjectId('chemistry');
                        setResourceType('محاكاة');
                        setCategory('تجربة واستقصاء علمي');
                        setCurriculum('سلطنة عمان - كامبريدج');
                        setUnit('الوحدة الثالثة: التفاعلات الكيميائية');
                        setTopic('دورة إدراج وفحص الموارد');
                        setTags(['اختبار', 'كيمياء', 'محاكاة تفاعلية']);
                        setEducationalObjectives([
                          'التحقق من دورة حياة المورد التعليمي بالكامل.',
                          'استعراض النتائج في البيئة التفاعلية المعزولة.'
                        ]);
                        setScientificConcepts(['التفاعل الكيميائي', 'المعادلات الأيونية']);
                        setHtmlContent(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:system-ui;padding:24px;text-align:center;background:#0f172a;color:#38bdf8;}button{background:#0284c7;color:white;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:bold;margin-top:16px;}</style></head><body><h2>مورد اختبار المكتبة الرقمية</h2><p>مدرسة محلاح للبنات (5-12) - تجربة تفاعلية</p><button onclick="alert('تم تفعيل المحاكاة بنجاح!')">بدء التجربة</button></body></html>`);
                        setFileName('digital_library_test.html');
                        setIsZipValidated(true);
                        showToast('تم تعبئة بيانات اختبار المكتبة الرقمية بنجاح', 'success');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      ملء بيانات الاختبار
                    </button>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-900 block">⚡ اختبار حزمة ZIP تفاعلية</span>
                      <span className="text-[11px] text-sky-700">قانون أوم - فيزياء التاسع - حزمة متكاملة</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadDemoZip}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      توليد واختبار الحزمة
                    </button>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان المورد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: محاكاة قانون أوم والدوائر الكهربائية"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                />

                {/* Duplicate Resource Alert (Requirement #9) */}
                {potentialDuplicates.length > 0 && !resourceToEdit && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/95 border border-amber-300 text-amber-900 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>تنبيه: يوجد مورد مشابه بالفعل في المكتبة، يرجى التحقق قبل الإضافة:</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {potentialDuplicates.map((dup) => (
                        <div key={dup.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{dup.title}</span>
                            <span className="text-slate-500 mr-2 text-[11px]">
                              ({dup.gradeName || 'صف غير محدد'} • {dup.subjectName || 'مادة'} • {dup.resourceType})
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                            {dup.version || 'الإصدار 1.0'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      يُفضل التحقق مما إذا كان المورد نسخة محدثة لنفس التجربة لتعديلها كإصدار جديد، أو مورداً مستقلاً تماماً لتفادي التكرار.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وصف المورد والأهداف العلمية <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب شرحاً موجزاً عن المورد وكيفية استخدامه في الحصة الدراسية أو المختبر..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium resize-none"
                />
              </div>

              {/* Author / Creator Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المعلم / معد المورد العلمي
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={user?.displayName || "مثال: أ. فاطمة الحجرية"}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                />
              </div>

              {/* Grade & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الصف الدراسي</label>
                  <select
                    value={gradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium cursor-pointer"
                  >
                    {effectiveGrades.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.stage})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المادة العلمية</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium cursor-pointer"
                  >
                    {validSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع المورد</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium cursor-pointer"
                  >
                    {resourceTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف التربوي</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium cursor-pointer"
                  >
                    <option value="تجربة واستقصاء علمي">تجربة واستقصاء علمي</option>
                    <option value="محاكاة ومختبر افتراضي">محاكاة ومختبر افتراضي</option>
                    <option value="نشاط تفاعلي">نشاط تفاعلي</option>
                    <option value="عرض وشرح تعليمي">عرض وشرح تعليمي</option>
                    <option value="تقويم واختبار ذاتي">تقويم واختبار ذاتي</option>
                    <option value="ورقة عمل وتدريب">ورقة عمل وتدريب</option>
                    <option value="مشروع ومهام استكشافية">مشروع ومهام استكشافية</option>
                  </select>
                </div>
              </div>

              {/* Curriculum, Unit & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">المنهج الدراسي</label>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    {curricula.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="منهج آخر">منهج آخر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الوحدة التعليمية</label>
                  <input
                    type="text"
                    list="units-datalist"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="اختر أو اكتب اسم الوحدة..."
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <datalist id="units-datalist">
                    {units
                      .filter(u => u.gradeId === gradeId && u.subjectId === subjectId)
                      .map(u => (
                        <option key={u.id} value={u.name} />
                      ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الموضوع / الدرس</label>
                  <input
                    type="text"
                    list="topics-datalist"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="اختر أو اكتب عنوان الدرس..."
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <datalist id="topics-datalist">
                    {topics
                      .filter(t => !unit || units.find(u => u.name === unit)?.id === t.unitId)
                      .map(t => (
                        <option key={t.id} value={t.name} />
                      ))}
                  </datalist>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الكلمات المفتاحية</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="أضف كلمة مفتاحية واضغط إضافة..."
                    className="flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-semibold border border-sky-100"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Educational Objectives & Concepts Accordion/Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Educational Objectives */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الأهداف التعليمية</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={objectiveInput}
                      onChange={(e) => setObjectiveInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddObjective(); } }}
                      placeholder="أضف هدفاً تعليمياً..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {educationalObjectives.map((obj, i) => (
                      <li key={i} className="text-[11px] p-1.5 bg-slate-50 rounded-lg flex items-center justify-between text-slate-700">
                        <span>• {obj}</span>
                        <button type="button" onClick={() => handleRemoveObjective(i)} className="text-rose-500 p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Scientific Concepts */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المفاهيم العلمية المرتبطة</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={conceptInput}
                      onChange={(e) => setConceptInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddConcept(); } }}
                      placeholder="أضف مفهوماً علمياً..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddConcept}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scientificConcepts.map((c, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                        <span>{c}</span>
                        <button type="button" onClick={() => handleRemoveConcept(i)} className="hover:text-rose-600">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: ملفات المورد
             ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Cover Image Upload & Presets */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-600" />
                    <span>صورة الغلاف (Cover Image)</span>
                  </label>
                  <input
                    type="file"
                    id={coverImageInputId}
                    onChange={handleCoverImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <label
                    htmlFor={coverImageInputId}
                    className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    رفع صورة من الجهاز
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={thumbnailUrl}
                    alt="معاينة الغلاف"
                    className="w-20 h-14 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="أو الصق رابط صورة الغلاف هنا..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                      <span>نماذج معتمدة:</span>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80')}
                        className="text-sky-600 hover:underline font-semibold"
                      >
                        كيمياء
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80')}
                        className="text-sky-600 hover:underline font-semibold"
                      >
                        فيزياء
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80')}
                        className="text-sky-600 hover:underline font-semibold"
                      >
                        أحياء
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl('https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80')}
                        className="text-sky-600 hover:underline font-semibold"
                      >
                        علوم عامة
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialized Interactive HTML Mode Section */}
              <div className="p-5 rounded-3xl border-2 border-dashed border-sky-300 bg-gradient-to-b from-sky-50/70 to-cyan-50/30 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileArchive className="w-5 h-5 text-sky-600" />
                      <span>الملف الرئيسي: رفع الحزم التفاعلية والملفات التعليمية</span>
                    </h4>
                    <p className="text-xs text-sky-800 font-medium mt-1">
                      يمكن رفع حزمة تفاعلية بصيغة ZIP تحتوي على ملف index.html وملفات CSS وJavaScript والصور والملفات المساندة.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadDemoZip}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    ⚡ حزمة تجريبية نموذجية
                  </button>
                </div>

                {/* Expected Package Structure Reference Card */}
                <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-sky-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1.5 text-[11px]">
                    الهيكل النموذجي المتوقع لحزمة ZIP التفاعلية:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-600">
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">📄 index.html (الملف الرئيسي)</div>
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">🎨 style.css (التنسيقات)</div>
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">⚡ script.js (البرمجة التفاعلية)</div>
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">📁 assets/ (الملفات المساندة)</div>
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">🖼️ images/ (الصور والرموز)</div>
                    <div className="bg-sky-50/80 px-2 py-1 rounded-lg">🔤 fonts/ (الخطوط)</div>
                  </div>
                </div>

                {/* Dropzone File Input */}
                <div className="text-center py-4 bg-white rounded-2xl border border-sky-200">
                  <input
                    type="file"
                    id={fileInputId}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".html,.htm,.zip,.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.mp4"
                  />
                  <label htmlFor={fileInputId} className="cursor-pointer block px-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                      {fileName.endsWith('.zip') ? (
                        <FileArchive className="w-6 h-6 text-indigo-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {fileName ? fileName : 'اضغط هنا لاختيار ملف الحزمة أو المورد من جهازك'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      يدعم: ZIP (حزم تفاعلية كاملة)، HTML، PDF، PPTX، DOCX، MP4، صور (الحد الأقصى 50MB)
                    </p>
                  </label>

                  {/* Upload Progress Bar */}
                  {isUploading && (
                    <div className="mt-3 max-w-xs mx-auto px-4">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-sky-500 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <span className="text-[11px] text-sky-700 font-bold mt-1 block">
                        جارٍ فحص وتحليل الملف... {uploadProgress}%
                      </span>
                    </div>
                  )}

                  {/* Validation Success Badge */}
                  {isZipValidated && (
                    <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم التحقق من الحزمة بنجاح: تم التعرف على ملف index.html الرئيسي وكافة التبعات</span>
                    </div>
                  )}
                </div>

                {/* Live Preview Button if validated HTML */}
                {htmlContent && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>كود المحاكاة جاهز في البيئة المعزولة الآمنة (Sandboxed Iframe)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLivePreview(!showLivePreview)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showLivePreview ? 'إخفاء المعاينة التفاعلية' : 'معاينة المورد التفاعلي'}</span>
                    </button>
                  </div>
                )}

                {/* Inline Live Sandboxed Preview */}
                {showLivePreview && htmlContent && (
                  <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg animate-in zoom-in-95">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-white">
                      <span className="font-bold flex items-center gap-1.5 text-cyan-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>معاينة حية للمورد التفاعلي داخل إطار آمن ومعزول (Sandboxed)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        مدرسة محلاح للبنات (5–12)
                      </span>
                    </div>
                    <div className="h-64 sm:h-80 bg-slate-900">
                      <iframe
                        srcDoc={htmlContent}
                        title="معاينة تفاعلية"
                        className="w-full h-full border-none"
                        sandbox="allow-scripts"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supporting Files Management */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>الملفات المساندة والمرفقات (أوراق عمل، دليل المعلم، بطاقات نشاط)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {supportingFiles.length} مرفقات
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSuppFileName}
                    onChange={(e) => setNewSuppFileName(e.target.value)}
                    placeholder="اسم الملف المساند (مثال: ورقة عمل الطالب - تجربة أوم)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={newSuppFileUrl}
                    onChange={(e) => setNewSuppFileUrl(e.target.value)}
                    placeholder="الرابط أو الملاحظة (اختياري)"
                    className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSupportingFile}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    إضافة
                  </button>
                </div>

                {supportingFiles.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {supportingFiles.map((sf, idx) => (
                      <li key={idx} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span className="font-bold text-slate-800">{sf.name}</span>
                          <span className="text-[10px] text-slate-400">({sf.size || '1 MB'})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupportingFile(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: إعدادات المورد
             ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Version */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم الإصدار (Version)
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="مثال: الإصدار 1.0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Target Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة المورد المستهدفة
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as 'draft' | 'submitted')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="submitted">إرسال للمراجعة (Submitted for Academic Review)</option>
                    <option value="draft">حفظ كمسودة خاصة (Draft)</option>
                  </select>
                </div>
              </div>

              {/* License / Usage Rights */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  حقوق الاستخدام والملكية الفكرية
                </label>
                <select
                  value={usageRights}
                  onChange={(e) => setUsageRights(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="جميع الحقوق محفوظة لمدرسة محلاح للبنات (5–12)">
                    جميع الحقوق محفوظة لمدرسة محلاح للبنات (5–12)
                  </option>
                  <option value="رخصة المشاع الإبداعي (CC BY-NC 4.0 - غير تجاري)">
                    رخصة المشاع الإبداعي (CC BY-NC 4.0 - غير تجاري)
                  </option>
                  <option value="مورد تعليمي مفتوح ومجاني للاستخدام المدرسي">
                    مورد تعليمي مفتوح ومجاني للاستخدام المدرسي
                  </option>
                  <option value="حقوق محفوظة للمعلم المصمم">
                    حقوق محفوظة للمعلم المصمم
                  </option>
                </select>
              </div>

              {/* Usage Context & Estimated Execution Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نمط وسياق الاستخدام</label>
                  <select
                    value={usageContext}
                    onChange={(e) => setUsageContext(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="استخدام مخبري وتطبيقي">استخدام مخبري وتطبيقي</option>
                    <option value="استخدام صفي تفاعلي">استخدام صفي تفاعلي</option>
                    <option value="تعلم ذاتي وفردي">تعلم ذاتي وفردي</option>
                    <option value="عمل جماعي وتعاوني">عمل جماعي وتعاوني</option>
                    <option value="تعليم عن بعد ومختبرات افتراضية">تعليم عن بعد ومختبرات افتراضية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">زمن التنفيذ التقديري</label>
                  <input
                    type="text"
                    value={executionTime}
                    onChange={(e) => setExecutionTime(e.target.value)}
                    placeholder="مثال: 45 دقيقة (حصة دراسية)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Permissions & Toggles */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">صلاحيات العرض والتنزيل</span>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200/60">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">إتاحة المعاينة التفاعلية المباشرة</span>
                    <span className="text-[11px] text-slate-500">تمكين الطلاب والمعلمين من تجربة المورد داخل المنصة</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowPreview}
                    onChange={(e) => setAllowPreview(e.target.checked)}
                    className="w-5 h-5 text-sky-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">إتاحة التحميل المباشر</span>
                    <span className="text-[11px] text-slate-500">تمكين المستخدمين من تنزيل ملف المورد وحزمته للعمل بدون إنترنت</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="w-5 h-5 text-sky-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: مراجعة قبل الإرسال
             ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-5 bg-gradient-to-r from-sky-50 via-slate-50 to-emerald-50 rounded-3xl border border-slate-200 space-y-4">
                
                {/* Header preview with thumbnail */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <img
                    src={thumbnailUrl}
                    alt={title}
                    className="w-full sm:w-44 h-28 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
                        {GRADES.find(g => g.id === gradeId)?.name || 'الصف العاشر'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                        {SUBJECTS.find(s => s.id === subjectId)?.name || 'الكيمياء'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {resourceType}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        targetStatus === 'submitted' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {targetStatus === 'submitted' ? 'سيتم إرساله للمراجعة' : 'سيحفظ كمسودة'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{title || 'بدون عنوان'}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{description || 'لا يوجد وصف'}</p>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-200 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">المنهج والوحدة</span>
                    <span className="font-bold text-slate-800 truncate block">{curriculum} • {unit || 'عام'}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">الموضوع / الدرس</span>
                    <span className="font-bold text-slate-800 truncate block">{topic || title}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">الملف الرئيسي</span>
                    <span className="font-bold text-slate-800 truncate block">{fileName || 'ملف تفاعلي'} ({fileSize || '1 MB'})</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">الإصدار والحقوق</span>
                    <span className="font-bold text-slate-800 truncate block">{version}</span>
                  </div>
                </div>

                {/* Educational Objectives & Concepts in Summary */}
                {(educationalObjectives.length > 0 || scientificConcepts.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    {educationalObjectives.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-800 block mb-1">الأهداف التعليمية ({educationalObjectives.length}):</span>
                        <ul className="space-y-1 text-[11px] text-slate-600">
                          {educationalObjectives.map((o, idx) => (
                            <li key={idx}>✓ {o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {scientificConcepts.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-800 block mb-1">المفاهيم العلمية:</span>
                        <div className="flex flex-wrap gap-1">
                          {scientificConcepts.map((c, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Security Verification & Interactive Test Sandbox in Step 4 */}
                {htmlContent && (
                  <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">
                          معاينة الحزمة التفاعلية المعزولة قبل الاعتماد
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        sandbox=&quot;allow-scripts&quot;
                      </span>
                    </div>

                    <div className="h-56 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                      <iframe
                        srcDoc={htmlContent}
                        title="معاينة تفاعلية قبل الإرسال"
                        className="w-full h-full border-none"
                        sandbox="allow-scripts"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          
          {/* Step Back or Cancel */}
          <div className="flex items-center gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            )}
          </div>

          {/* Next Step or Submit Buttons */}
          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <span>التالي: {currentStep === 1 ? 'ملفات المورد' : currentStep === 2 ? 'إعدادات المورد' : 'مراجعة قبل الإرسال'}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('draft')}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'جارٍ الحفظ في Supabase...' : 'حفظ كمسودة'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave('submitted')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSubmitting ? 'جارٍ الحفظ في Supabase...' : 'إرسال للمراجعة'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
