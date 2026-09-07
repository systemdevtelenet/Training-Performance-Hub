import EmployeesClient from './EmployeesClient';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .order('id', { ascending: false });

    if (empErr) {
      console.error('Error fetching employees:', empErr);
    }

    const { data: statuses } = await supabase.from('statuses').select('*');
    const { data: accounts } = await supabase.from('accounts').select('*');
    const { data: assignments } = await supabase.from('employee_assignments').select('*');

    // Create lookup maps
    const statusMap = new Map<number, string>();
    (statuses || []).forEach(s => statusMap.set(s.status_id, s.status_name));

    const accountMap = new Map<number, string>();
    (accounts || []).forEach(a => accountMap.set(a.account_id, a.account_name || a.account_code));

    // Group assigned accounts by employee_id
    const empAccountsMap = new Map<number, string[]>();
    (assignments || []).forEach(asg => {
      const accName = accountMap.get(asg.account_id);
      if (accName && asg.employee_id) {
        const existing = empAccountsMap.get(asg.employee_id) || [];
        if (!existing.includes(accName)) {
          existing.push(accName);
          empAccountsMap.set(asg.employee_id, existing);
        }
      }
    });

    const enrichedEmployees = (employees || []).map(emp => {
      const assignedAccs = empAccountsMap.get(emp.id) || [];
      const statusName = statusMap.get(emp.status_id) || (emp.status_id === 1 ? 'Active' : emp.status_id === 2 ? 'Inactive' : 'Active');
      return {
        ...emp,
        status_name: statusName,
        assigned_accounts: assignedAccs.length > 0 ? assignedAccs.join(', ') : 'Unassigned',
        account_ids: (assignments || []).filter(a => a.employee_id === emp.id).map(a => a.account_id)
      };
    });

    return (
      <EmployeesClient
        initialEmployees={enrichedEmployees}
        accounts={accounts || []}
        statuses={statuses || []}
      />
    );
  } catch (error) {
    console.error('Error in EmployeesPage:', error);
    return <EmployeesClient initialEmployees={[]} accounts={[]} statuses={[]} />;
  }
}
