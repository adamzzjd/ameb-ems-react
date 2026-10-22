import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { useEmployees } from './hooks/useEmployees';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee } from './types';
import { dbCheckTable } from './supabase/employees';
import { CsvImportModal } from './pages/CsvImportModal';
import { exportEmployeesCSV } from './lib/csv';
import { fetchFullBackup, downloadBackup } from './lib/backup';
import { printEmployees } from './utils/print';
import { CADRE_NAMES, CADRE_GRADES, STATIONS } from './data/constants';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
// Public website sub-pages — real URLs, served to visitors and to signed-in
// staff alike (everything else in the portal keeps its state-driven routing).
const ProgramsPage = lazy(() => import('./pages/public/ProgramsPage').then(m => ({ default: m.ProgramsPage })));
const ProgramDetailPage = lazy(() => import('./pages/public/ProgramDetailPage').then(m => ({ default: m.ProgramDetailPage })));
const CentresPage = lazy(() => import('./pages/public/CentresPage').then(m => ({ default: m.CentresPage })));
const NewsPage = lazy(() => import('./pages/public/NewsPage').then(m => ({ default: m.NewsPage })));
const NewsArticlePage = lazy(() => import('./pages/public/NewsArticlePage').then(m => ({ default: m.NewsArticlePage })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const SelfService = lazy(() => import('./pages/SelfService').then(m => ({ default: m.SelfService })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const EmployeesPage = lazy(() => import('./pages/Employees').then(m => ({ default: m.EmployeesPage })));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile').then(m => ({ default: m.EmployeeProfile })));
const EmployeeForm = lazy(() => import('./pages/EmployeeForm').then(m => ({ default: m.EmployeeForm })));
const GroupView = lazy(() => import('./pages/GroupView').then(m => ({ default: m.GroupView })));
const Appointment = lazy(() => import('./pages/Appointment').then(m => ({ default: m.Appointment })));
const StationsManager = lazy(() => import('./pages/StationsManager').then(m => ({ default: m.StationsManager })));
const CadresManager = lazy(() => import('./pages/CadresManager').then(m => ({ default: m.CadresManager })));
const LgaOfficersManager = lazy(() => import('./pages/LgaOfficersManager').then(m => ({ default: m.LgaOfficersManager })));
const CentresManager = lazy(() => import('./pages/CentresManager').then(m => ({ default: m.CentresManager })));
const CmsDashboard = lazy(() => import('./pages/cms/CmsDashboard').then(m => ({ default: m.CmsDashboard })));
const SiteContent = lazy(() => import('./pages/cms/SiteContent').then(m => ({ default: m.SiteContent })));
const CmsPrograms = lazy(() => import('./pages/cms/CmsPrograms').then(m => ({ default: m.CmsPrograms })));
const CmsNews = lazy(() => import('./pages/cms/CmsNews').then(m => ({ default: m.CmsNews })));
const CmsTeam = lazy(() => import('./pages/cms/CmsTeam').then(m => ({ default: m.CmsTeam })));
const CmsDownloads = lazy(() => import('./pages/cms/CmsDownloads').then(m => ({ default: m.CmsDownloads })));
const CmsGallery = lazy(() => import('./pages/cms/CmsGallery').then(m => ({ default: m.CmsGallery })));
const CmsInbox = lazy(() => import('./pages/cms/CmsInbox').then(m => ({ default: m.CmsInbox })));
const CmsEnrolments = lazy(() => import('./pages/cms/CmsEnrolments').then(m => ({ default: m.CmsEnrolments })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.UserManagement })));
const AuditLogPage = lazy(() => import('./pages/AuditLog').then(m => ({ default: m.AuditLogPage })));
const MyAccountPage = lazy(() => import('./pages/MyAccount').then(m => ({ default: m.MyAccountPage })));
const RetirementPage = lazy(() => import('./pages/Retirement').then(m => ({ default: m.RetirementPage })));
const PromotionPage = lazy(() => import('./pages/Promotion').then(m => ({ default: m.PromotionPage })));
const PsnCheckPage = lazy(() => import('./pages/PsnCheck').then(m => ({ default: m.PsnCheckPage })));
const DataQualityPage = lazy(() => import('./pages/DataQuality').then(m => ({ default: m.DataQualityPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// ── Loading spinner ───────────────────────────────────────────────────────
function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-border border-t-navy rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

type View = 'landing' | 'login' | 'app' | 'selfservice';

export default function App() {
  const { user, loading: authLoading, can } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('landing');
  const [currentPage, setCurrentPage] = useState('dashboard');
  // PSN prefilled into the self-service portal when entered from the site header.
  const [selfServicePsn, setSelfServicePsn] = useState('');
  const [tableReady, setTableReady] = useState(true);
  // Password-recovery mode: Supabase emails a link that returns here with a
  // `#/reset` hash carrying the recovery tokens (see ResetPassword).
  const [resetMode, setResetMode] = useState(() => window.location.hash.startsWith('#/reset'));

  // ── Public website routes ─────────────────────────────────────────────────
  // The site's pages have real URLs; `/` stays with the landing page, and any
  // other path falls through to the portal's own state-driven navigation.
  const location = useLocation();
  const navigate = useNavigate();
  const publicPath = location.pathname.replace(/\/+$/, '') || '/';
  const publicPage =
    /^\/programs\/.+/.test(publicPath) ? 'program'
    : publicPath === '/programs' ? 'programs'
    : publicPath === '/centres' ? 'centres'
    : /^\/news\/.+/.test(publicPath) ? 'article'
    : publicPath === '/news' ? 'news'
    : null;
  // The two portal entry screens also live at real URLs — they are linked from
  // the header of every public page, so a link must work from anywhere and a
  // refresh must land on the same screen.
  const portalEntry: 'login' | 'selfservice' | null =
    publicPath === '/login' ? 'login'
    : publicPath === '/self-service' ? 'selfservice'
    : null;
  // The portal's screens are addressable too: /portal/<page>. Keeps the address
  // bar honest after sign-in (it used to stay on /login) and makes screens
  // bookmarkable.
  const portalPage = /^\/portal\/([a-z-]+)$/.exec(publicPath)?.[1] ?? null;

  const {
    employees, loading: empLoading,
    filtered, paginated, filter, totalPages,
    setFilter, clearFilters,
    saveEmployee, deleteEmployee, bulkImport,
  } = useEmployees();

  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  useEffect(() => {
    // Stay on the reset view while a recovery link is being processed — the
    // setSession call signs the user in, but they must finish setting the new
    // password before entering the app.
    if (!authLoading && user && !resetMode) setView('app');
  }, [user, authLoading, resetMode]);

  useEffect(() => {
    if (view === 'app' && !user && !authLoading) {
      setView('login');
      // Leave the portal URL behind when the session ends.
      if (portalPage) navigate('/login', { replace: true });
    }
  }, [view, user, authLoading, portalPage, navigate]);

  // A portal URL (or the browser's back/forward buttons) selects the screen.
  useEffect(() => {
    if (!portalPage || authLoading || !user) return;
    setCurrentPage(portalPage);
    setView('app');
  }, [portalPage, user, authLoading]);

  // Signing in from /login or /self-service moves the address bar into the
  // portal, so it never sits on the login screen while the app is open.
  useEffect(() => {
    if (authLoading || !user || resetMode) return;
    if (publicPath === '/login' || publicPath === '/self-service') {
      navigate(`/portal/${portalPage || currentPage}`, { replace: true });
    }
  }, [user, authLoading, resetMode, publicPath, portalPage, currentPage, navigate]);

  useEffect(() => {
    if (view === 'app') {
      dbCheckTable().then(ready => setTableReady(ready));
    }
  }, [view]);

  const handleGoToLogin = () => navigate('/login');
  const handleBackToSite = () => { setView('landing'); navigate('/'); };
  const handleGoToSelfService = useCallback((psn?: string) => {
    setSelfServicePsn(psn || '');
    navigate('/self-service');
  }, [navigate]);
  const handleNavigate = useCallback((page: string) => {
    setCurrentPage(page);
    if (user) navigate(`/portal/${page}`);
  }, [user, navigate]);

  const handleViewEmployee = useCallback((id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) { setProfileEmployee(emp); setShowProfile(true); }
  }, [employees]);

  const handleEditEmployee = useCallback((id: string) => {
    if (!can('employees.edit')) { toast('You need editor access to edit records.', true); return; }
    const emp = employees.find(e => e.id === id);
    if (emp) { setEditingEmployee(emp); setShowForm(true); }
  }, [can, employees, toast]);

  const handleAddEmployee = useCallback(() => {
    if (!can('employees.create')) { toast('You need editor access to add records.', true); return; }
    setEditingEmployee(null); setShowForm(true);
  }, [can, toast]);

  const handleSaveEmployee = useCallback(async (data: Partial<Employee> & { name: string }) => {
    if (data.id ? !can('employees.edit') : !can('employees.create')) {
      toast('You need editor access to save records.', true);
      return false;
    }
    const { data: saved, error } = await saveEmployee(data);
    if (error) {
      let msg = error.message;
      if ((error as { code?: string }).code === '23505') msg = 'PSN already exists — each officer must have a unique PSN.';
      toast(msg, true);
      return false;
    }
    if (saved) toast(`✓ ${saved.name} ${data.id ? 'updated' : 'added'} successfully.`);
    return true;
  }, [can, saveEmployee, toast]);

  const handleDeleteEmployee = useCallback(async (id: string) => {
    if (!can('employees.delete')) { toast('You need delete access to remove records.', true); return; }
    const success = await deleteEmployee(id);
    if (success) {
      const name = employees.find(e => e.id === id)?.name || 'Employee';
      toast(`${name} removed from register.`);
    } else {
      toast('Delete failed.', true);
    }
    setShowDeleteConfirm(null);
  }, [can, deleteEmployee, employees, toast]);

  const handlePrint = useCallback(() => {
    if (currentPage === 'employees') {
      printEmployees(filtered, 'Filtered Staff List', 'Current filter view');
    } else {
      printEmployees(employees, 'Full Staff Register', 'All officers');
    }
  }, [currentPage, filtered, employees]);

  const handleExportCSV = useCallback(() => {
    if (!can('employees.export')) { toast('You need export access for this action.', true); return; }
    // On the Employees page, export exactly what's on screen (current filters &
    // sort); everywhere else, the full register.
    const rows = currentPage === 'employees' ? filtered : employees;
    exportEmployeesCSV(rows);
    toast(`💾 ${rows.length} record${rows.length !== 1 ? 's' : ''} exported${currentPage === 'employees' ? ' (current filter view)' : ''}.`);
  }, [can, employees, filtered, currentPage, toast]);

  const handleImport = useCallback(async (records: Partial<Employee>[]) => {
    if (!can('employees.import')) { toast('You need import access for this action.', true); return 0; }
    return await bulkImport(records);
  }, [can, bulkImport, toast]);

  const handleBackup = useCallback(async () => {
    if (!can('settings.manage')) { toast('Admin access required to back up the register.', true); return; }
    toast('💾 Creating backup…');
    const backup = await fetchFullBackup();
    downloadBackup(backup);
    toast(`💾 Backup downloaded — ${backup.tables.employees?.length ?? 0} officers, ${Object.keys(backup.tables).length} tables.`);
  }, [can, toast]);

  const deletingName = showDeleteConfirm
    ? employees.find(e => e.id === showDeleteConfirm)?.name
    : null;

  // ── Auth loading ──
  if (authLoading) return <LoadingSpinner text="Authenticating…" />;

  // ── Route guards — hide restricted pages even if reached via state ──
  // (only enforced inside the app shell, so landing/login always render)
  const ACCESS_DENIED = 'You do not have permission to view this page.';
  if (view === 'app' && currentPage.startsWith('cms-') && !can('cms.edit')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }
  if (view === 'app' && (currentPage === 'stations' || currentPage === 'cadres' || currentPage === 'lga-officers') && !can('settings.manage')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }
  if (view === 'app' && currentPage === 'users' && !can('users.manage')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }
  if (view === 'app' && currentPage === 'audit-log' && !can('audit.view')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }
  if (view === 'app' && currentPage === 'psn-check' && !can('employees.import')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }

  // ── Main content ──
  const renderMainContent = () => {
    if (empLoading) return <LoadingSpinner text="Loading employees…" />;

    if (!tableReady) {
      return (
        <Card className="max-w-md mx-auto mt-12 text-center">
          <CardContent className="p-8">
            <div className="text-5xl mb-3">⚙️</div>
            <h3 className="text-lg font-bold text-foreground mb-2">Database Setup Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The employees table doesn't exist yet. Run the SQL setup script in your Supabase dashboard.
            </p>
          </CardContent>
        </Card>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard employees={employees} onViewEmployee={handleViewEmployee} onNavigate={handleNavigate} />;
      case 'employees':
        return (
          <EmployeesPage
            employees={employees} filter={filter} paginated={paginated}
            filtered={filtered} totalPages={totalPages} onFilterChange={setFilter}
            onClearFilters={clearFilters} onViewEmployee={handleViewEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={(id) => setShowDeleteConfirm(id)}
            onPrint={handlePrint}
            canEdit={can('employees.edit')}
            canDelete={can('employees.delete')}
          />
        );
      case 'station':
        return <GroupView employees={employees} groupBy="station" title="Present Station" icon="📍" onViewEmployee={handleViewEmployee} onEditEmployee={handleEditEmployee} onDeleteEmployee={(id) => setShowDeleteConfirm(id)} canEdit={can('employees.edit')} canDelete={can('employees.delete')} />;
      case 'lga':
        return <GroupView employees={employees} groupBy="lga" title="LGA of Origin" icon="🗺" onViewEmployee={handleViewEmployee} onEditEmployee={handleEditEmployee} onDeleteEmployee={(id) => setShowDeleteConfirm(id)} canEdit={can('employees.edit')} canDelete={can('employees.delete')} />;
      case 'grade':
        return <GroupView employees={employees} groupBy="grade" title="Grade Level" icon="📋" onViewEmployee={handleViewEmployee} onEditEmployee={handleEditEmployee} onDeleteEmployee={(id) => setShowDeleteConfirm(id)} canEdit={can('employees.edit')} canDelete={can('employees.delete')} />;
      case 'appointment':
        return <Appointment employees={employees} onViewEmployee={handleViewEmployee} />;
      case 'stations':
        return <StationsManager onNavigate={handleNavigate} />;
      case 'cadres':
        return <CadresManager onNavigate={handleNavigate} />;
      case 'lga-officers':
        return <LgaOfficersManager onNavigate={handleNavigate} canManage={can('settings.manage')} />;
      case 'centres':
        return <CentresManager employees={employees} canManage={can('settings.manage')} />;
      case 'cms-dashboard':
        return <CmsDashboard onNavigate={handleNavigate} />;
      case 'cms-content':
        return <SiteContent onNavigate={handleNavigate} />;
      case 'cms-programs':
        return <CmsPrograms />;
      case 'cms-news':
        return <CmsNews />;
      case 'cms-team':
        return <CmsTeam />;
      case 'cms-downloads':
        return <CmsDownloads />;
      case 'cms-gallery':
        return <CmsGallery />;
      case 'cms-inbox':
        return <CmsInbox />;
      case 'cms-enrolments':
        return <CmsEnrolments />;
      case 'users':
        return <UserManagement />;
      case 'audit-log':
        return <AuditLogPage />;
      case 'account':
        return <MyAccountPage />;
      case 'retirement':
        return <RetirementPage employees={employees} onViewEmployee={handleViewEmployee} />;
      case 'promotions':
        return <PromotionPage employees={employees} onViewEmployee={handleViewEmployee} />;
      case 'psn-check':
        return <PsnCheckPage />;
      case 'data-quality':
        return <DataQualityPage employees={employees} onEditEmployee={handleEditEmployee} />;
      default:
        return <NotFound message={`Page "${currentPage}" not found.`} onGoHome={() => setCurrentPage('dashboard')} />;
    }
  };

  if (publicPage) {
    // Declared as real routes so the detail pages can read their `:slug`
    // through useParams (the portal itself keeps its state-driven navigation).
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:slug" element={<ProgramDetailPage />} />
            <Route path="/centres" element={<CentresPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsArticlePage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Direct visits and header links to the portal entry screens render from the
  // URL. Once signed in the app takes over (the auth effect sets view 'app').
  if (!user && !resetMode && (portalEntry || portalPage)) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          {portalEntry === 'selfservice'
            ? <SelfService onBack={handleBackToSite} initialPsn={selfServicePsn} />
            : <Login onBackToSite={handleBackToSite} onSelfService={handleGoToSelfService} />}
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {resetMode && (
        <Suspense fallback={<LoadingSpinner />}>
          <ResetPassword
            onDone={() => { setResetMode(false); setView('app'); }}
            onCancel={() => { setResetMode(false); setView('login'); }}
          />
        </Suspense>
      )}

      {!resetMode && view === 'landing' && (
        <Suspense fallback={<LoadingSpinner />}>
          <Landing onGoToLogin={handleGoToLogin} onGoToSelfService={handleGoToSelfService} />
        </Suspense>
      )}

      {!resetMode && view === 'login' && (
        <Suspense fallback={<LoadingSpinner />}>
          <Login onBackToSite={handleBackToSite} onSelfService={handleGoToSelfService} />
        </Suspense>
      )}

      {!resetMode && view === 'selfservice' && (
        <Suspense fallback={<LoadingSpinner />}>
          <SelfService onBack={() => setView('landing')} initialPsn={selfServicePsn} />
        </Suspense>
      )}

      {view === 'app' && (
        <AppShell
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onAddEmployee={handleAddEmployee}
          onImportCsv={() => setShowCsvImport(true)}
          onExportCsv={handleExportCSV}
          onPrint={handlePrint}
          employeeCount={employees.length}
          canAdd={can('employees.create')}
          onBackup={handleBackup}
        >
          <Suspense fallback={<LoadingSpinner />}>
            {renderMainContent()}
          </Suspense>
        </AppShell>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        open={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onImport={handleImport}
        existingEmployees={employees}
      />

      {/* Employee Profile Modal */}
      <Suspense fallback={null}>
        <EmployeeProfile
          employee={profileEmployee}
          open={showProfile}
          onClose={() => { setShowProfile(false); setProfileEmployee(null); }}
          onEdit={(id) => { setShowProfile(false); handleEditEmployee(id); }}
          onDelete={(id) => { setShowProfile(false); setShowDeleteConfirm(id); }}
          canEdit={can('employees.edit')}
          canDelete={can('employees.delete')}
        />
      </Suspense>

      {/* Employee Form Modal */}
      <Suspense fallback={null}>
        <EmployeeForm
          open={showForm}
          onClose={() => { setShowForm(false); setEditingEmployee(null); }}
          onSave={handleSaveEmployee}
          employee={editingEmployee}
          stations={[...STATIONS]}
          cadres={[...CADRE_NAMES]}
          cadreGrades={CADRE_GRADES}
        />
      </Suspense>

      {/* Delete Confirmation — shadcn/ui Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => { if (!open) setShowDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <DialogTitle>Delete Employee Record</DialogTitle>
            <DialogDescription>
              <p className="font-semibold text-foreground mb-1">{deletingName || 'Unknown'}</p>
              <p className="text-muted-foreground">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteEmployee(showDeleteConfirm)}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
