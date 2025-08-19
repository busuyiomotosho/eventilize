import { signOut, useSession } from 'next-auth/react';
import React from 'react';

export default function LogoutButton() {
  const { data: session, status } = useSession();
  if (!session) return null;
  return (
    <button
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-4"
      onClick={() => signOut({ callbackUrl: '/auth/login' })}
    >
      Logout
    </button>
  );
}
