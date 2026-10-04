import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../store/useAppStore';

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
    let role = 'Owner';
    let organizationId = user.uid; // default: own workspace
    let usedInviteId: string | undefined = undefined;

    const pendingInviteId = sessionStorage.getItem('pendingInviteId');
    if (pendingInviteId) {
      try {
        const inviteRef = doc(db, 'invitations', pendingInviteId);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const inviteData = inviteSnap.data();
          if (inviteData.email.toLowerCase() === email.toLowerCase()) {
            role = inviteData.role;
            organizationId = inviteData.organizationId;
            usedInviteId = pendingInviteId;
          }
        }
      } catch (err) {
        console.error('Failed to verify invitation:', err);
      }
    }

    const record = {
      id: profile.id,
      name: profile.name,
      email,
      role,
      status: 'Active',
      organizationId,
      lastActive: new Date().toISOString(),
      ...(usedInviteId ? { inviteId: usedInviteId } : {})
    };
    await setDoc(userRef, record);
    
    if (usedInviteId) {
      try {
        await deleteDoc(doc(db, 'invitations', usedInviteId));
      } catch (err) {
        console.error('Failed to delete invitation:', err);
      }
    }
    
    sessionStorage.removeItem('pendingInviteId');
    return { ...profile, role: record.role, organizationId: record.organizationId };
  } catch (err) {
    console.error('Failed to provision user in team:', err);
    return profile;
  }
}
