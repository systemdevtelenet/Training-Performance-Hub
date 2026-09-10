import PageLoading from '@/components/PageLoading';

export default function EmployeesLoading() {
  return (
    <PageLoading
      title="Loading Employees Management..."
      subtitle="Retrieving company roster and employee account assignments"
    />
  );
}
