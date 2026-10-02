import React, { useState } from 'react';
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
import { ResourceItem, isAdminRole } from './types';

const MainApp: React.FC = () => {
  const { role } = useAuth();
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
    setFilters
  } = useResources();

  const [currentTab, setCurrentTab] = useState<string>('home');
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const publishedResources = resources.filter(r => r.status === 'published');

  // Navigation handlers
  const handleNavigate = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGrade = (gradeId: string) => {
    setFilters({ gradeId });
    setCurrentTab('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSubject = (subjectId: string) => {
    setFilters({ subjectId });
    setCurrentTab('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchFromHero = (query: string) => {
    setFilters({ searchQuery: query });
    setCurrentTab('library');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenInsert = () => {
    setEditingResource(null);
    setIsInsertModalOpen(true);
  };

  const handleEditResource = (resource: ResourceItem) => {
    setEditingResource(resource);
    setIsInsertModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-['Cairo',sans-serif] text-slate-800 antialiased selection:bg-cyan-500 selection:text-white">
      
      {/* Toast Notifications */}
      <NotificationToast />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenInsertModal={() => setIsInsertModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* TAB: HOME */}
        {currentTab === 'home' && (
          <>
            {/* 1. Header (Navbar) is sticky top */}
            
            {/* 2 & 3. عنوان المكتبة ومدرسة محلاح للبنات (5–12) وتصميم جواهر المعمرية ومحرك البحث والفلترة السريعة */}
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

            {/* 4. الصفوف الدراسية (5–12) */}
            <GradeSection onSelectGrade={handleSelectGrade} />

            {/* 5. المواد الدراسية (العلوم، الكيمياء، الفيزياء، الأحياء، العلوم البيئية) */}
            <SubjectSection onSelectSubject={handleSelectSubject} />

            {/* 6. الموارد المميزة */}
            <FeaturedResources
              resources={resources}
              onOpenDetails={openResource}
              onLaunch={launchResource}
              onViewAll={() => handleNavigate('library')}
            />

            {/* مستكشف المنهج المدرسي التفاعلي */}
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

            {/* 7. المكتبة الشاملة / مستكشف الموارد */}
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

        {/* TAB: CURRICULUM EXPLORER */}
        {currentTab === 'curriculum' && (
          <CurriculumExplorer
            onOpenLibraryWithFilter={(gradeId, subjectId, unit, topic) => {
              setFilters({ gradeId, subjectId, unit, topic });
              setCurrentTab('library');
              window.scrollTo({ top: 0, behavior: 'smooth' });
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

        {/* TAB: DIGITAL LIBRARY */}
        {currentTab === 'library' && (
          <DigitalLibrary
            onOpenDetails={openResource}
            onLaunch={launchResource}
            onOpenInsertModal={handleOpenInsert}
            onEditResource={handleEditResource}
          />
        )}

        {/* TAB: GRADES ONLY */}
        {currentTab === 'grades' && (
          <div className="py-6">
            <GradeSection onSelectGrade={handleSelectGrade} />
          </div>
        )}

        {/* TAB: SUBJECTS ONLY */}
        {currentTab === 'subjects' && (
          <div className="py-6">
            <SubjectSection onSelectSubject={handleSelectSubject} />
          </div>
        )}

        {/* TAB: USER'S DASHBOARD */}
        {currentTab === 'my-resources' && (
          <UserDashboard
            onOpenDetails={openResource}
            onLaunch={launchResource}
            onOpenInsertModal={handleOpenInsert}
            onEditResource={handleEditResource}
          />
        )}

        {/* TAB: FAVORITES */}
        {currentTab === 'favorites' && (
          <UserDashboard
            onOpenDetails={openResource}
            onLaunch={launchResource}
            onOpenInsertModal={handleOpenInsert}
            onEditResource={handleEditResource}
          />
        )}

        {/* TAB: REVIEW WORKFLOW (Reviewer & Admin) */}
        {currentTab === 'review' && (role === 'reviewer' || isAdminRole(role)) && (
          <ReviewWorkflowPage
            onOpenDetails={openResource}
            onLaunch={launchResource}
          />
        )}

        {/* TAB: ADMIN DASHBOARD (Administrator) */}
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

        {/* TAB: ADMIN SETTINGS (Administrator) */}
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
      </main>

      {/* Resource Details Modal */}
      <ResourceDetailsModal
        resource={activeResource}
        isOpen={!!activeResource}
        onClose={() => setActiveResource(null)}
        onLaunch={launchResource}
        onEditResource={handleEditResource}
      />

      {/* Secure Sandboxed Simulation Runner Modal */}
      <ResourceSandboxModal
        resource={sandboxResource}
        isOpen={isSandboxOpen}
        onClose={closeSandbox}
      />

      {/* Insert / Edit Resource Modal */}
      <InsertResourceModal
        isOpen={isInsertModalOpen}
        resourceToEdit={editingResource}
        onClose={() => {
          setIsInsertModalOpen(false);
          setEditingResource(null);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* About School & Platform Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ResourceProvider>
        <MainApp />
      </ResourceProvider>
    </AuthProvider>
  );
}
