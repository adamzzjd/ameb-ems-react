import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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
import { CsvImportModal, exportEmployeesCSV } from './pages/CsvImportModal';
import { printEmployees } from './utils/print';
import { CADRE_NAMES, CADRE_GRADES, STATIONS } from './data/constants';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const EmployeesPage = lazy(() => import('./pages/Employees').then(m => ({ default: m.EmployeesPage })));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile').then(m => ({ default: m.EmployeeProfile })));
const EmployeeForm = lazy(() => import('./pages/EmployeeForm').then(m => ({ default: m.EmployeeForm })));
const GroupView = lazy(() => import('./pages/GroupView').then(m => ({ default: m.GroupView })));
const Appointment = lazy(() => import('./pages/Appointment').then(m => ({ default: m.Appointment })));
const StationsManager = lazy(() => import('./pages/StationsManager').then(m => ({ default: m.StationsManager })));
const CadresManager = lazy(() => import('./pages/CadresManager').then(m => ({ default: m.CadresManager })));
const FacilitatorsManager = lazy(() => import('./pages/FacilitatorsManager').then(m => ({ default: m.FacilitatorsManager })));
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

type View = 'landing' | 'login' | 'app';

export default function App() {
  const { user, loading: authLoading, can } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('landing');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [tableReady, setTableReady] = useState(true);

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
    if (!authLoading && user) setView('app');
  }, [user, authLoading]);

  useEffect(() => {
    if (view === 'app' && !user && !authLoading) setView('login');
  }, [view, user, authLoading]);

  useEffect(() => {
    if (view === 'app') {
      dbCheckTable().then(ready => setTableReady(ready));
    }
  }, [view]);

  const handleGoToLogin = () => setView('login');
  const handleBackToSite = () => setView('landing');
  const handleNavigate = useCallback((page: string) => setCurrentPage(page), []);

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
    exportEmployeesCSV(employees);
    toast('💾 CSV exported successfully.');
  }, [can, employees, toast]);

  const handleImport = useCallback(async (records: Partial<Employee>[]) => {
    if (!can('employees.import')) { toast('You need import access for this action.', true); return 0; }
    return await bulkImport(records);
  }, [can, bulkImport, toast]);

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
  if (view === 'app' && (currentPage === 'stations' || currentPage === 'cadres' || currentPage === 'facilitators') && !can('settings.manage')) {
    return <NotFound message={ACCESS_DENIED} onGoHome={() => setCurrentPage('dashboard')} />;
  }
  if (view === 'app' && currentPage === 'users' && !can('users.manage')) {
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
      case 'facilitators':
        return <FacilitatorsManager onNavigate={handleNavigate} canManage={can('settings.manage')} />;
      case 'centres':
        return <CentresManager onNavigate={handleNavigate} canManage={can('settings.manage')} />;
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
      default:
        return <NotFound message={`Page "${currentPage}" not found.`} onGoHome={() => setCurrentPage('dashboard')} />;
    }
  };

  return (
    <ErrorBoundary>
      {view === 'landing' && (
        <Suspense fallback={<LoadingSpinner />}>
          <Landing onGoToLogin={handleGoToLogin} />
        </Suspense>
      )}

      {view === 'login' && (
        <Suspense fallback={<LoadingSpinner />}>
          <Login onBackToSite={handleBackToSite} />
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
