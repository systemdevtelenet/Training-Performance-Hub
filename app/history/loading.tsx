import PageLoading from '@/components/PageLoading';

export default function HistoryLoading() {
  return (
    <PageLoading
      title="Loading Activity Logs..."
      subtitle="Fetching recent system audit logs and timeline events"
    />
  );
}
