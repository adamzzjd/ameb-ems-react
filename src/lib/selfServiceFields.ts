import { LGAs, GRADES, CADRE_NAMES, STATIONS } from '../data/constants';

/** One editable self-service field. Shared by the officer portal and the
 *  admin review queue so both always describe the same set of columns. */
export interface SelfServiceFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  options?: readonly string[];
  placeholder?: string;
}

export const SELF_SERVICE_FIELDS: readonly SelfServiceFieldDef[] = [
  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Aisha Bello' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
  { key: 'grade', label: 'Grade Level', type: 'select', options: GRADES },
  { key: 'cadre', label: 'Cadre', type: 'select', options: CADRE_NAMES },
  { key: 'date_first_appt', label: 'Date of First Appointment', type: 'date' },
  { key: 'date_present_appt', label: 'Date of Present Appointment', type: 'date' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'phone', label: 'Phone Number', type: 'text', placeholder: 'e.g. 0803 123 4567' },
  { key: 'lga', label: 'LGA of Origin', type: 'select', options: LGAs },
  { key: 'station', label: 'Present Station', type: 'select', options: STATIONS },
  { key: 'address', label: 'Residential Address', type: 'text', placeholder: 'e.g. 15 Ahmadu Bello Way, Yola' },
  { key: 'step', label: 'Salary Step', type: 'text', placeholder: 'e.g. 1' },
  { key: 'remarks', label: 'Remarks / Notes', type: 'textarea', placeholder: 'Optional notes…' },
];
