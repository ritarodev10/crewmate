import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('crewmate_session');

  if (!session?.value) {
    redirect('/login');
  }

  try {
    const parsed = JSON.parse(session.value) as { role: string };
    if (parsed.role === 'worker') redirect('/today');
    redirect('/dispatch');
  } catch {
    redirect('/login');
  }
}
