import { redirect } from 'next/navigation';

export default function AttendanceRedirectPage() {
  redirect('/trainers?tab=calendar');
}
