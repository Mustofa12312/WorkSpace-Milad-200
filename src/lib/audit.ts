import { db } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'Task' | 'Project' | 'Document' | 'Meeting' | 'Team' | 'Event';

export async function logAuditAction(
  orgId: string,
  user: { id: string; name: string },
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  details: string
) {
  try {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const logRef = doc(collection(db, 'auditLogs'), logId);
    
    await setDoc(logRef, {
      organizationId: orgId,
      userId: user.id,
      userName: user.name,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // We intentionally don't throw or show toast here, as audit logging shouldn't crash the main app flow
  }
}
