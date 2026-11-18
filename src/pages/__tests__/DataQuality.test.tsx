import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataQualityPage } from '../DataQuality';
import type { Employee } from '../../types';

function emp(overrides: Partial<Employee>): Employee {
  return {
    id: '1',
    name: 'Aisha Bello',
    gender: 'Female',
    grade: 'GL 09',
    cadre: 'Adult Education Officer I',
    date_first_appt: '2010-01-01',
    date_present_appt: '2015-01-01',
    dob: '1980-05-01',
    phone: '08031234567',
    lga: 'Yola North',
    psn: '199401003222',
    station: 'Yola (HQ)',
    photo: null,
    step: '3',
    address: null,
    remarks: '',
    ...overrides,
  };
}

const clean = emp({ id: '1', name: 'Aisha Bello' });
const badPsn = emp({ id: '2', name: 'Bulus Dauda', psn: 'TESTUI0001' });
const badGrade = emp({ id: '3', name: 'Hauwa Musa', grade: 'GL 07/1', step: null });

describe('DataQualityPage — PSN / grade errors view', () => {
  it('counts officers whose PSN or grade is damaged', () => {
    render(<DataQualityPage employees={[clean, badPsn, badGrade]} onEditEmployee={vi.fn()} />);
    expect(screen.getByText('PSN / Grade Errors')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PSN \/ Grade errors \(2\)/ })).toBeInTheDocument();
  });

  it('lists only the damaged officers with their problem', async () => {
    const user = userEvent.setup();
    render(<DataQualityPage employees={[clean, badPsn, badGrade]} onEditEmployee={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /PSN \/ Grade errors/ }));

    expect(screen.getByText('Bulus Dauda')).toBeInTheDocument();
    expect(screen.getByText('Hauwa Musa')).toBeInTheDocument();
    expect(screen.queryByText('Aisha Bello')).not.toBeInTheDocument();
    expect(screen.getByText('PSN not valid')).toBeInTheDocument();
    expect(screen.getByText('Step typed inside grade')).toBeInTheDocument();
  });

  it('says so when every record is valid', async () => {
    const user = userEvent.setup();
    render(<DataQualityPage employees={[clean]} onEditEmployee={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /PSN \/ Grade errors/ }));

    expect(screen.getByText('Every PSN and grade looks valid.')).toBeInTheDocument();
  });
});
