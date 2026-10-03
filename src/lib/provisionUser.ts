import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../store/useAppStore';

export const DEFAULT_ORG_ID = 'default-org-1';

/**
 * Ensures the signed-in user has a `team/{uid}` document and returns their
 * profile. Must complete BEFORE realtime subscriptions start, because the
 * Firestore rules resolve the caller's organization from this document.
 *
 * New users always start as 'Member' — firestore.rules rejects any attempt to
 * self-assign a higher role. Promote the first Owner via Firebase Console.
 */
export async function ensureTeamMember(user: FirebaseUser): Promise<User> {
  const email = user.email || '';
  const profile: User = {
    id: user.uid,
    name: user.displayName || email.split('@')[0] || 'User',
    email,
    avatar: user.photoURL || undefined,
  };

  try {
    const userRef = doc(db, 'team', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<User>;
      return { ...profile, role: data.role, organizationId: data.organizationId };
    }
    const record = {
      id: profile.id,
      name: profile.name,
      email,
      role: 'Member',
      status: 'Active',
      organizationId: DEFAULT_ORG_ID,
      lastActive: new Date().toISOString(),
    };
    await setDoc(userRef, record);
    return { ...profile, role: record.role, organizationId: record.organizationId };
  } catch (err) {
    console.error('Failed to provision user in team:', err);
    return profile;
  }
}
