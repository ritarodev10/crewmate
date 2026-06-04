'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FIXTURE_SESSIONS } from '@/lib/fixtures';

export async function loginAction(
  email: string,
  _password: string,
): Promise<{ error: string }> {
  const session = FIXTURE_SESSIONS[email];
  if (!session) {
    return {
      error: 'No fixture account found for this email. Try admin@brookline.demo.',
    };
  }

  const cookieStore = await cookies();
  cookieStore.set('crewmate_session', JSON.stringify(session), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  if (session.role === 'worker') redirect('/today');
  redirect('/dispatch');
}
