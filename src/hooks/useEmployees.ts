import { useState, useEffect, useCallback } from 'react';
import type { Employee, FilterState } from '../types';
import { dbLoadAll, dbSave, dbDelete, dbBulkInsert } from '../supabase/employees';

const PAGE_SIZE = 50;

interface UseEmployeesReturn {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  filtered: Employee[];
  paginated: Employee[];
  filter: FilterState;
  totalPages: number;
  setFilter: (f: Partial<FilterState>) => void;
  clearFilters: () => void;
  refresh: () => Promise<void>;
  saveEmployee: (emp: Partial<Employee> & { name: string }) => Promise<{ data: Employee | null; error: Error | null }>;
  deleteEmployee: (id: string) => Promise<boolean>;
  bulkImport: (records: Partial<Employee>[]) => Promise<number>;
}

const defaultFilter: FilterState = {
  search: '',
  lga: '',
  station: '',
  grade: '',
  sortField: 'name',
  sortDir: 1,
  page: 1,
};

export function useEmployees(): UseEmployeesReturn {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<FilterState>(defaultFilter);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await dbLoadAll();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const setFilter = useCallback((f: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...f, page: f.page ?? 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterState(defaultFilter);
  }, []);

  // Compute filtered + sorted list
  const filtered = employees
    .filter(e => {
      const q = filter.search.toLowerCase();
      if (q && !(
        (e.name || '').toLowerCase().includes(q) ||
        (e.psn || '').toLowerCase().includes(q) ||
        (e.cadre || '').toLowerCase().includes(q) ||
        (e.station || '').toLowerCase().includes(q) ||
        (e.phone || '').includes(q)
      )) return false;
      if (filter.lga && e.lga !== filter.lga) return false;
      if (filter.station && e.station !== filter.station) return false;
      if (filter.grade && e.grade !== filter.grade) return false;
      return true;
    })
    .sort((a, b) => {
      const va = (a[filter.sortField] || '').toString().toLowerCase();
      const vb = (b[filter.sortField] || '').toString().toLowerCase();
      return va < vb ? -filter.sortDir : va > vb ? filter.sortDir : 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const from = (filter.page - 1) * PAGE_SIZE;
  const paginated = filtered.slice(from, from + PAGE_SIZE);

  const saveEmployee = useCallback(async (emp: Partial<Employee> & { name: string }) => {
    const { data, error: err } = await dbSave(emp);
    if (err) return { data: null, error: err };
    if (data) {
      setEmployees(prev =>
        emp.id
          ? prev.map(e => e.id === data.id ? data : e)
          : [...prev, data]
      );
    }
    return { data, error: null };
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    const { error: err } = await dbDelete(id);
    if (err) return false;
    setEmployees(prev => prev.filter(e => e.id !== id));
    return true;
  }, []);

  const bulkImport = useCallback(async (records: Partial<Employee>[]) => {
    const { data, error: err } = await dbBulkInsert(records);
    if (err || !data) return 0;
    setEmployees(prev => [...prev, ...data]);
    return data.length;
  }, []);

  return {
    employees, loading, error,
    filtered, paginated, filter, totalPages,
    setFilter, clearFilters,
    refresh: loadData,
    saveEmployee, deleteEmployee, bulkImport,
  };
}
