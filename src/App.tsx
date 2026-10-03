import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ResourceProvider, useResources } from './context/ResourceContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { GradeSection } from './components/GradeSection';
import { SubjectSection } from './components/SubjectSection';
import { FeaturedResources } from './components/FeaturedResources';
import { DigitalLibrary } from './components/DigitalLibrary';
import { ReviewWorkflowPage } from './components/ReviewWorkflowPage';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { ResourceDetailsModal } from './components/ResourceDetailsModal';
import { ResourceSandboxModal } from './components/ResourceSandboxModal';
import { InsertResourceModal } from './components/InsertResourceModal';
import { AuthModal } from './components/AuthModal';
import { AboutModal } from './components/AboutModal';
import { NotificationToast } from './components/NotificationToast';
import { CurriculumExplorer } from './components/CurriculumExplorer';
import { LoginPage } from './components/LoginPage';
import { ResourceItem, isAdminRole } from './types';
import { FlaskConical } from 'lucide-react';

const ADMIN_ROUTES = ['admin', 'settings'];
const AUTH_PROTECTED_ROUTES = ['admin', 'settings', 'review', 'my-resources', 'favorites'];

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth, role } = useAuth();
  const {
    resources,
    grades,
    subjects,
    activeResource,
    setActiveResource,
    editingResource,
    setEditingResource,
    sandboxResource,
    isSandboxOpen,
    launchResource,
    closeSandbox,
    openResource,
    setFilters,
    showToast
  } = useResources();

  // Robust SPA route resolution helper for direct refresh and browser history
  const getTabFromPath = (pathname: string): string => {
    const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
    if (!clean || clean === 'home') return 'home';
    const validTabs = ['library', 'curriculum', 'grades', 'subjects', 'login', 'admin', 'settings', 'review', 'my-resources', 'favorites'];
    if (validTabs.includes(clean)) {
      return clean;
    }
    return 'home';
  };

  // Navigation state initialized based on URL pathname
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return getTabFromPath(window.location.pathname);
  });

  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const publishedResources = resources.filter(r => r.status === 'published');

  // Synchronize browser history (Back / Forward buttons) with currentTab
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = getTabFromPath(window.location.pathname);
      setCurrentTab(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route Protection & Auth Guard:
  // Public pages (home, library, curriculum, grades, subjects) are COMPLETELY OPEN to all visitors and students.
  // Redirect to /login ONLY when attempting to access restricted administrative or user dashboard features.
  useEffect(() => {
    if (!isLoadingAuth) {
      if ((!isAuthenticated || !user) && AUTH_PROTECTED_ROUTES.includes(currentTab)) {
        showToast('يرجى تسجيل الدخول للوصول إلى لوحة الإدارة وإدارة الموارد', 'warning');
        setCurrentTab('login');
        if (window.location.pathname !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
      }
    }
  }, [isAuthenticated, user, isLoadingAuth, currentTab]);

  // Navigation handler
  const handleNavigate = (tab: string) => {
    // 1. Strict Auth Guard on admin & private dashboard pages
    if (AUTH_PROTECTED_ROUTES.includes(tab) && (!isAuthenticated || !user)) {
      showToast('يرجى تسجيل الدخول للوصول إلى هذا القسم المحمي', 'warning');
      setCurrentTab('login');
      if (window.location.pathname !== '/login') {
        window.history.pushState(null, '', '/login');
      }
      return;
    }

    // 2. Strict Role Guard: Admin only
    if (ADMIN_ROUTES.includes(tab) && !isAdminRole(role)) {
      showToast('منطقة محمية: هذا القسم مخصص لمدير النظام فقط', 'error');
      return;
    }

    // 3. Strict Role Guard: Reviewer or Admin only
    if (tab === 'review' && !(role === 'reviewer' || isAdminRole(role))) {
      showToast('منطقة محمية: هذا القسم مخصص للمراجع الأكاديمي', 'error');
      return;
    }

    setCurrentTab(tab);
    const targetPath = tab === 'home' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Public navigation shortcuts (accessible to anyone)
  const handleSelectGrade = (gradeId: string) => {
    setFilters({ gradeId });
    handleNavigate('library');
  };

  const handleSelectSubject = (subjectId: string) => {
    setFilters({ subjectId });
    handleNavigate('library');
  };

  const handleSearchFromHero = (query: string) => {
    setFilters({ searchQuery: query });
    handleNavigate('library');
  };

  // Resource Insertion / Editing Guard (Requires Auth)
  const handleOpenInsert = () => {
    if (!isAuthenticated || !user) {
      showToast('يرجى تسجيل الدخول لإدراج موارد تعليمية جديدة', 'info');
      handleNavigate('login');
      return;
    }
    setEditingResource(null);
    setIsInsertModalOpen(true);
  };

  const handleEditResource = (resource: ResourceItem) => {
    if (!isAuthenticated || !user) {
      showToast('يرجى تسجيل الدخول لتعديل الموارد التعليمية', 'info');
      handleNavigate('login');
      return;
    }
    setEditingResource(resource);
    setIsInsertModalOpen(true);
  };

  // Auth Initialization Spinner (Only shown briefly on first session check)
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-['Cairo',sans-serif] text-slate-800">
        <div className="text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-sky-500/25 animate-pulse">
            <FlaskConical className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">مكتبة العلوم الرقمية</h3>
            <p className="text-xs text-slate-500">مدرسة محلاح للبنات (5–12)...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-['Cairo',sans-serif] text-slate-800 antialiased selection:bg-cyan-500 selection:text-white">
      
      {/* Toast Notifications */}
      <NotificationToast />

      {/* Top Navbar (Always accessible) */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenInsertModal={handleOpenInsert}
        onOpenAuthModal={() => {
          if (!isAuthenticated) {
            handleNavigate('login');
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* LOGIN PAGE: Rendered only when visiting /login */}
        {currentTab === 'login' ? (
          <LoginPage
            onLoginSuccess={() => handleNavigate('home')}
            onReturnHome={() => handleNavigate('home')}
          />
        ) : (
          <>
            {/* TAB: HOME (Public to all visitors and students) */}
            {currentTab === 'home' && (
              <>
                {/* Hero Section */}
                <HeroSection
                  onExplore={() => handleNavigate('library')}
                  onInsert={handleOpenInsert}
                  onSearch={handleSearchFromHero}
                  onSelectGrade={handleSelectGrade}
                  onSelectSubject={handleSelectSubject}
                  publishedCount={publishedResources.length}
                  totalCount={resources.length}
                  interactiveCount={resources.filter(r => r.htmlContent || r.previewType === 'html' || r.resourceType.includes('تفاعلي') || r.resourceType.includes('محاكاة')).length}
                  gradesCount={grades && grades.length > 0 ? grades.length : 8}
                  subjectsCount={subjects && subjects.length > 0 ? subjects.length : 5}
                />

                {/* Grade Section (5–12) */}
                <GradeSection onSelectGrade={handleSelectGrade} />

                {/* Subject Section */}
                <SubjectSection onSelectSubject={handleSelectSubject} />

                {/* Featured Resources */}
                <FeaturedResources
                  resources={resources}
                  onOpenDetails={openResource}
                  onLaunch={launchResource}
                  onViewAll={() => handleNavigate('library')}
                />

                {/* Curriculum Explorer Promo */}
                <section className="py-8 bg-slate-50 border-t border-slate-200/80">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
                      <div className="space-y-2">
                        <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                          الهيكل العلمي للمنصة 🌟
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold">📚 مستكشف المنهج المدرسي</h3>
                        <p className="text-xs sm:text-sm text-sky-100 max-w-xl leading-relaxed">
                          استكشف الموارد التعليمية والتجارب المخبرية المنظمة وفق التسلسل المنهجي المعتمد:
                          <span className="font-bold text-white"> الصف ⟵ المادة ⟵ الوحدة ⟵ الدرس</span>.
                        </p>
                      </div>
                      <button
                        onClick={() => handleNavigate('curriculum')}
                        className="px-6 py-3 bg-white text-indigo-700 hover:bg-sky-50 font-bold rounded-2xl text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer"
                      >
                        تصفح عبر مستكشف المنهج ⬅️
                      </button>
                    </div>
                  </div>
                </section>

                {/* Digital Library Embedded Section (Public browsing & simulation launch) */}
                <section className="py-12 bg-white border-t border-slate-200/80">
                  <DigitalLibrary
                    onOpenDetails={openResource}
                    onLaunch={launchResource}
                    onOpenInsertModal={handleOpenInsert}
                    onEditResource={handleEditResource}
                    isEmbeddedInHome={true}
                  />
                </section>
              </>
            )}

            {/* TAB: CURRICULUM EXPLORER (Public) */}
            {currentTab === 'curriculum' && (
              <CurriculumExplorer
                onOpenLibraryWithFilter={(gradeId, subjectId, unit, topic) => {
                  setFilters({ gradeId, subjectId, unit, topic });
                  handleNavigate('library');
                }}
                onOpenInsert={(prefill) => {
                  if (prefill) {
                    setEditingResource({
                      ...prefill
                    } as any);
                  }
                  setIsInsertModalOpen(true);
                }}
              />
            )}

            {/* TAB: DIGITAL LIBRARY (MAIN LIBRARY DASHBOARD - Public to all visitors) */}
            {currentTab === 'library' && (
              <DigitalLibrary
                onOpenDetails={openResource}
                onLaunch={launchResource}
                onOpenInsertModal={handleOpenInsert}
                onEditResource={handleEditResource}
              />
            )}

            {/* TAB: GRADES ONLY (Public) */}
            {currentTab === 'grades' && (
              <div className="py-6">
                <GradeSection onSelectGrade={handleSelectGrade} />
              </div>
            )}

            {/* TAB: SUBJECTS ONLY (Public) */}
            {currentTab === 'subjects' && (
              <div className="py-6">
                <SubjectSection onSelectSubject={handleSelectSubject} />
              </div>
            )}

            {/* TAB: USER'S DASHBOARD (Protected) */}
            {currentTab === 'my-resources' && (
              <UserDashboard
                onOpenDetails={openResource}
                onLaunch={launchResource}
                onOpenInsertModal={handleOpenInsert}
                onEditResource={handleEditResource}
                onOpenAuthModal={() => handleNavigate('login')}
              />
            )}

            {/* TAB: FAVORITES (Protected) */}
            {currentTab === 'favorites' && (
              <UserDashboard
                onOpenDetails={openResource}
                onLaunch={launchResource}
                onOpenInsertModal={handleOpenInsert}
                onEditResource={handleEditResource}
                onOpenAuthModal={() => handleNavigate('login')}
              />
            )}

            {/* TAB: REVIEW WORKFLOW (Protected - Reviewer & Admin) */}
            {currentTab === 'review' && (role === 'reviewer' || isAdminRole(role)) && (
              <ReviewWorkflowPage
                onOpenDetails={openResource}
                onLaunch={launchResource}
              />
            )}

            {/* TAB: ADMIN DASHBOARD (Protected - Administrator Only) */}
            {currentTab === 'admin' && isAdminRole(role) && (
              <AdminDashboard
                onNavigateToReview={() => handleNavigate('review')}
                onNavigateToLibrary={() => handleNavigate('library')}
                onOpenInsertModal={handleOpenInsert}
                onEditResource={handleEditResource}
                onOpenDetails={openResource}
                onLaunch={launchResource}
              />
            )}

            {/* TAB: ADMIN SETTINGS (Protected - Administrator Only) */}
            {currentTab === 'settings' && isAdminRole(role) && (
              <AdminDashboard
                initialTab="system"
                onNavigateToReview={() => handleNavigate('review')}
                onNavigateToLibrary={() => handleNavigate('library')}
                onOpenInsertModal={handleOpenInsert}
                onEditResource={handleEditResource}
                onOpenDetails={openResource}
                onLaunch={launchResource}
              />
            )}
          </>
        )}
      </main>

      {/* Resource Details Modal (Public - can view details & download without login) */}
      <ResourceDetailsModal
        resource={activeResource}
        isOpen={!!activeResource}
        onClose={() => setActiveResource(null)}
        onLaunch={launchResource}
        onEditResource={handleEditResource}
      />

      {/* Secure Sandboxed Simulation Runner Modal (Public - any student can play simulations) */}
      <ResourceSandboxModal
        resource={sandboxResource}
        isOpen={isSandboxOpen}
        onClose={closeSandbox}
      />

      {/* Insert / Edit Resource Modal (Protected) */}
      <InsertResourceModal
        isOpen={isInsertModalOpen}
        onClose={() => {
          setIsInsertModalOpen(false);
          setEditingResource(null);
        }}
        resourceToEdit={editingResource}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* About School & Library Modal (Public) */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Footer (Public) */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ResourceProvider>
        <MainApp />
      </ResourceProvider>
    </AuthProvider>
  );
}

export default App;
