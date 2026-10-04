import { GradeItem, SubjectItem, ResourceTypeItem, ResourceItem, CurriculumItem, UnitItem, TopicItem } from '../types';
import {
  SIMULATION_RUTHERFORD,
  SIMULATION_METALS,
  SIMULATION_CELL,
  SIMULATION_PUNNETT,
  SIMULATION_NEWTON
} from './simulations';

export const INITIAL_CURRICULA: CurriculumItem[] = [
  {
    id: 'curric-oman',
    name: 'منهج سلطنة عمان',
    description: 'المنهج الدراسي الوطني المعتمد من وزارة التربية والتعليم لسلطنة عمان',
    isDefault: true,
    isActive: true
  },
  {
    id: 'curric-cambridge',
    name: 'منهج كامبريدج (Cambridge)',
    description: 'سلسلة مناهج كامبريدج الدولية للعلوم الحديثة',
    isDefault: false,
    isActive: true
  }
];

export const INITIAL_UNITS: UnitItem[] = [
  {
    id: 'unit-chem-11-atom',
    curriculumId: 'curric-oman',
    gradeId: 'grade-11',
    subjectId: 'chemistry',
    name: 'الوحدة الأولى: البناء الذري والجدول الدوري',
    order: 1,
    description: 'تطور النماذج الذرية، تجربة رذرفورد، وتوزيع الإلكترونات في الذرات',
    isActive: true
  },
  {
    id: 'unit-phys-11-nuclear',
    curriculumId: 'curric-oman',
    gradeId: 'grade-11',
    subjectId: 'physics',
    name: 'الوحدة الأولى: الفيزياء الذرية والإشعاع',
    order: 1,
    description: 'جسيمات ألفا وبيتا، النشاط الإشعاعي، والنماذج النووية',
    isActive: true
  },
  {
    id: 'unit-chem-10-reactions',
    curriculumId: 'curric-oman',
    gradeId: 'grade-10',
    subjectId: 'chemistry',
    name: 'الوحدة الثانية: التفاعلات الكيميائية',
    order: 2,
    description: 'أنواع التفاعلات الكيميائية وسلسلة النشاط وسرعة التفاعل',
    isActive: true
  },
  {
    id: 'unit-phys-9-electricity',
    curriculumId: 'curric-oman',
    gradeId: 'grade-9',
    subjectId: 'physics',
    name: 'الوحدة الثالثة: الكهرباء والمغناطيسية',
    order: 3,
    description: 'قانون أوم وتوصيل المقاومات والقوة الدافعة الكهربائية',
    isActive: true
  },
  {
    id: 'unit-bio-9-cell',
    curriculumId: 'curric-oman',
    gradeId: 'grade-9',
    subjectId: 'biology',
    name: 'الوحدة الأولى: بنية الخلية ووظائفها',
    order: 1,
    description: 'العضيات الخلوية والغشاء البلازمي والوظائف الحيوية',
    isActive: true
  },
  {
    id: 'unit-bio-12-genetics',
    curriculumId: 'curric-oman',
    gradeId: 'grade-12',
    subjectId: 'biology',
    name: 'الوحدة الثانية: علم الوراثة والتطبيقات الحيوية',
    order: 2,
    description: 'قوانين مندل ومربع بانيت والتقانة الحيوية والهندسة الوراثية',
    isActive: true
  },
  {
    id: 'unit-env-12-biodiversity',
    curriculumId: 'curric-oman',
    gradeId: 'grade-12',
    subjectId: 'environmental-science',
    name: 'الوحدة الثالثة: التنوع البيولوجي والبيئات الطبيعية',
    order: 3,
    description: 'التنوع الحيوي، السلاسل الغذائية، والنظم البيئية العمانية',
    isActive: true
  },
  {
    id: 'unit-sci-8-light',
    curriculumId: 'curric-oman',
    gradeId: 'grade-8',
    subjectId: 'general-science',
    name: 'الوحدة الأولى: الضوء والرؤية وتطبيقاتها',
    order: 1,
    description: 'انعكاس وانكسار الضوء وتكون الصور في العدسات والمرايا',
    isActive: true
  }
];

export const INITIAL_TOPICS: TopicItem[] = [
  {
    id: 'topic-rutherford',
    unitId: 'unit-chem-11-atom',
    gradeId: 'grade-11',
    subjectId: 'chemistry',
    name: 'تجربة رذرفورد على صفيحة الذهب والنموذج النووي للذرة',
    order: 1,
    description: 'استنتاج وجود النواة الموجبة والفراغ الذري وتشتت جسيمات ألفا',
    isActive: true
  },
  {
    id: 'topic-alpha-particles',
    unitId: 'unit-phys-11-nuclear',
    gradeId: 'grade-11',
    subjectId: 'physics',
    name: 'جسيمات ألفا والتشتت النووي',
    order: 1,
    description: 'انحراف الجسيمات المشحونة وقوى كولوم داخل الذرة',
    isActive: true
  },
  {
    id: 'topic-metals-reactivity',
    unitId: 'unit-chem-10-reactions',
    gradeId: 'grade-10',
    subjectId: 'chemistry',
    name: 'سلسلة النشاط الكيميائي وتفاعلات الفلزات',
    order: 1,
    description: 'تفاعل الفلزات مع الأحماض والماء والأكسجين',
    isActive: true
  },
  {
    id: 'topic-ohm-law',
    unitId: 'unit-phys-9-electricity',
    gradeId: 'grade-9',
    subjectId: 'physics',
    name: 'قانون أوم والعلاقة بين الجهد والتيار والمقاومة',
    order: 1,
    description: 'التحقق العملي من العلاقة الرياضية I = V / R',
    isActive: true
  },
  {
    id: 'topic-cell-structure',
    unitId: 'unit-bio-9-cell',
    gradeId: 'grade-9',
    subjectId: 'biology',
    name: 'مقارنة الخلية النباتية والخلية الحيوانية تحت المجهر',
    order: 1,
    description: 'دراسة الجدار الخلوي، البلاستيدات، الغشاء، والنواة',
    isActive: true
  },
  {
    id: 'topic-punnett-square',
    unitId: 'unit-bio-12-genetics',
    gradeId: 'grade-12',
    subjectId: 'biology',
    name: 'السيادة التامة ومربع بانيت لتوارث الصفات',
    order: 1,
    description: 'تطبيق احتمالات الوراثة المندلية',
    isActive: true
  },
  {
    id: 'topic-env-punnett',
    unitId: 'unit-env-12-biodiversity',
    gradeId: 'grade-12',
    subjectId: 'environmental-science',
    name: 'المربع القياسي والتنوع الوراثي في البيئة العمانية',
    order: 1,
    description: 'الوراثة السكانية والتكيف البيولوجي في البيئات العمانية',
    isActive: true
  },
  {
    id: 'topic-water-cycle',
    unitId: 'unit-sci-8-light',
    gradeId: 'grade-8',
    subjectId: 'general-science',
    name: 'انعكاس الضوء والرؤية',
    order: 1,
    description: 'قوانين الانعكاس والمرايا المستوية والكروية',
    isActive: true
  }
];

export const GRADES: GradeItem[] = [
  { id: 'grade-5', name: 'الصف الخامس', number: 5, stage: 'التعليم الأساسي' },
  { id: 'grade-6', name: 'الصف السادس', number: 6, stage: 'التعليم الأساسي' },
  { id: 'grade-7', name: 'الصف السابع', number: 7, stage: 'التعليم الأساسي' },
  { id: 'grade-8', name: 'الصف الثامن', number: 8, stage: 'التعليم الأساسي' },
  { id: 'grade-9', name: 'الصف التاسع', number: 9, stage: 'التعليم الأساسي' },
  { id: 'grade-10', name: 'الصف العاشر', number: 10, stage: 'التعليم الأساسي' },
  { id: 'grade-11', name: 'الصف الحادي عشر', number: 11, stage: 'التعليم ما بعد الأساسي' },
  { id: 'grade-12', name: 'الصف الثاني عشر', number: 12, stage: 'التعليم ما بعد الأساسي' },
];

export const SUBJECTS: SubjectItem[] = [
  {
    id: 'general-science',
    name: 'العلوم',
    iconName: 'Atom',
    color: 'from-blue-500 to-cyan-500',
    grades: ['grade-5', 'grade-6', 'grade-7', 'grade-8'],
    description: 'العلوم العامة والمتكاملة للمرحلة الأساسية'
  },
  {
    id: 'biology',
    name: 'الأحياء',
    iconName: 'Dna',
    color: 'from-emerald-500 to-teal-500',
    grades: ['grade-9', 'grade-10', 'grade-11', 'grade-12'],
    description: 'علوم الكائنات الحية والوراثة والوظائف الحيوية'
  },
  {
    id: 'physics',
    name: 'الفيزياء',
    iconName: 'Zap',
    color: 'from-indigo-500 to-sky-500',
    grades: ['grade-9', 'grade-10', 'grade-11', 'grade-12'],
    description: 'دراسة المادة والطاقة والحركة والقوى والكون'
  },
  {
    id: 'chemistry',
    name: 'الكيمياء',
    iconName: 'FlaskConical',
    color: 'from-purple-500 to-pink-500',
    grades: ['grade-9', 'grade-10', 'grade-11', 'grade-12'],
    description: 'تركيب المواد وتفاعلاتها والروابط الكيميائية'
  },
  {
    id: 'environmental-science',
    name: 'العلوم البيئية',
    iconName: 'Globe',
    color: 'from-teal-500 to-cyan-600',
    grades: ['grade-11', 'grade-12'],
    description: 'دراسة النظم البيئية والموارد الطبيعية والتنوع الحيوي'
  }
];

export const RESOURCE_TYPES: ResourceTypeItem[] = [
  { id: 'interactive-lesson', name: 'درس تفاعلي', iconName: 'MonitorPlay', description: 'دروس تعليمية غنية بالشروحات والأنشطة' },
  { id: 'simulation', name: 'محاكاة', iconName: 'Cpu', description: 'تجارب ومختبرات علمية رقمية تفاعلية' },
  { id: 'educational-game', name: 'لعبة تعليمية', iconName: 'Gamepad2', description: 'ألعاب تثبيت المفاهيم العلمية بمتعة' },
  { id: 'interactive-activity', name: 'نشاط تفاعلي', iconName: 'Sparkles', description: 'أنشطة استقصائية وتطبيقات عملية' },
  { id: 'quiz', name: 'اختبار', iconName: 'CheckCircle2', description: 'اختبارات تقييمية وتمارين ذاتية' },
  { id: 'worksheet', name: 'ورقة عمل', iconName: 'FileSpreadsheet', description: 'أوراق عمل وأنشطة كتابية' },
  { id: 'presentation', name: 'عرض تقديمي', iconName: 'Presentation', description: 'عروض PowerPoint وتوضيحات مرئية' },
  { id: 'educational-video', name: 'فيديو تعليمي', iconName: 'Video', description: 'شروحات مرئية وتجارب مسجلة' },
  { id: 'educational-image', name: 'صورة تعليمية', iconName: 'Image', description: 'مخططات ورسوم بيانية وانفوجرافيك' },
  { id: 'pdf-file', name: 'ملف PDF', iconName: 'FileText', description: 'مستندات وأدلة وكتب دراسية' },
  { id: 'word-file', name: 'ملف Word', iconName: 'FileCode', description: 'مستندات قابلة للتحرير والتنسيق' },
  { id: 'powerpoint-file', name: 'ملف PowerPoint', iconName: 'FilePieChart', description: 'ملفات عروض قابلة للتحميل' },
  { id: 'html-file', name: 'ملف HTML', iconName: 'Code', description: 'صفحة ويب تعليمية مفردة' },
  { id: 'html-package', name: 'حزمة HTML تفاعلية', iconName: 'Package', description: 'حزمة تطبيقية تفاعلية كاملة مع الأصول' },
  { id: 'lab-resource', name: 'مورد مخبري', iconName: 'FlaskConical', description: 'تجارب وأنشطة مخصصة للمختبر المدرسي' },
  { id: 'classroom-resource', name: 'مورد صفي', iconName: 'BookOpen', description: 'أنشطة تدريسية وتطبيقات داخل الغرفة الصفية' },
  { id: 'other', name: 'موارد أخرى', iconName: 'FolderPlus', description: 'موارد مساعدة ومتفرقة' }
];

export const INITIAL_RESOURCES: ResourceItem[] = [];
