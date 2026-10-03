/**
 * Firestore security rules tests — run with `npm run test:rules`
 * (starts the Firestore + Storage emulators via firebase-tools).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

const ORG_A = 'default-org-1';
const ORG_B = 'other-org';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-milad',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'team/owner'), { id: 'owner', role: 'Owner', organizationId: ORG_A });
    await setDoc(doc(db, 'team/admin'), { id: 'admin', role: 'Admin', organizationId: ORG_A });
    await setDoc(doc(db, 'team/member'), { id: 'member', role: 'Member', organizationId: ORG_A });
    await setDoc(doc(db, 'team/outsider'), { id: 'outsider', role: 'Owner', organizationId: ORG_B });
    await setDoc(doc(db, 'tasks/task-a'), { title: 'A', status: 'backlog', organizationId: ORG_A });
    await setDoc(doc(db, 'tasks/task-b'), { title: 'B', status: 'backlog', organizationId: ORG_B });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('unauthenticated access', () => {
  it('denies all reads and writes', async () => {
    await assertFails(getDoc(doc(anon(), 'tasks/task-a')));
    await assertFails(setDoc(doc(anon(), 'tasks/x'), { organizationId: ORG_A }));
    await assertFails(getDoc(doc(anon(), 'team/member')));
  });
});

describe('org-scoped collections', () => {
  it('allows members to query their own org', async () => {
    await assertSucceeds(getDocs(query(collection(as('member'), 'tasks'), where('organizationId', '==', ORG_A))));
  });

  it('denies querying another org or an unscoped collection', async () => {
    await assertFails(getDocs(query(collection(as('member'), 'tasks'), where('organizationId', '==', ORG_B))));
    await assertFails(getDocs(collection(as('member'), 'tasks')));
  });

  it('denies reading a single document from another org', async () => {
    await assertSucceeds(getDoc(doc(as('member'), 'tasks/task-a')));
    await assertFails(getDoc(doc(as('member'), 'tasks/task-b')));
  });

  it('allows creating docs only in the caller org', async () => {
    await assertSucceeds(setDoc(doc(as('member'), 'tasks/new'), { title: 'N', organizationId: ORG_A }));
    await assertFails(setDoc(doc(as('member'), 'tasks/evil'), { title: 'X', organizationId: ORG_B }));
    await assertFails(setDoc(doc(as('member'), 'tasks/no-org'), { title: 'X' }));
  });

  it('prevents hijacking another org document by rewriting organizationId', async () => {
    await assertFails(setDoc(doc(as('member'), 'tasks/task-b'), { title: 'pwned', organizationId: ORG_A }));
  });

  it('prevents moving a document to another org', async () => {
    await assertFails(updateDoc(doc(as('member'), 'tasks/task-a'), { organizationId: ORG_B }));
  });

  it('allows status updates within the org', async () => {
    await assertSucceeds(updateDoc(doc(as('member'), 'tasks/task-a'), { status: 'review' }));
  });

  it('restricts deletes to Owner/Admin', async () => {
    await assertFails(deleteDoc(doc(as('member'), 'tasks/task-a')));
    await assertSucceeds(deleteDoc(doc(as('admin'), 'tasks/task-a')));
    await assertFails(deleteDoc(doc(as('outsider'), 'tasks/task-a')));
  });

  it('denies users without a team profile', async () => {
    await assertFails(getDocs(query(collection(as('ghost'), 'tasks'), where('organizationId', '==', ORG_A))));
  });

  it('denies unknown collections by default', async () => {
    await assertFails(setDoc(doc(as('owner'), 'secrets/x'), { organizationId: ORG_A }));
  });
});

describe('team profiles', () => {
  it('lets a new user self-provision only as Member of the default org', async () => {
    await assertSucceeds(
      setDoc(doc(as('newbie'), 'team/newbie'), { id: 'newbie', role: 'Member', organizationId: ORG_A }),
    );
  });

  it('rejects self-provisioning as Owner or into another org', async () => {
    await assertFails(setDoc(doc(as('n1'), 'team/n1'), { id: 'n1', role: 'Owner', organizationId: ORG_A }));
    await assertFails(setDoc(doc(as('n2'), 'team/n2'), { id: 'n2', role: 'Member', organizationId: ORG_B }));
  });

  it('lets a user read their own (even non-existent) profile', async () => {
    await assertSucceeds(getDoc(doc(as('newbie'), 'team/newbie')));
  });

  it('lets members list teammates in their org only', async () => {
    await assertSucceeds(getDocs(query(collection(as('member'), 'team'), where('organizationId', '==', ORG_A))));
    await assertFails(getDocs(query(collection(as('member'), 'team'), where('organizationId', '==', ORG_B))));
  });

  it('prevents users from escalating their own role or switching org', async () => {
    await assertFails(updateDoc(doc(as('member'), 'team/member'), { role: 'Owner' }));
    await assertFails(updateDoc(doc(as('member'), 'team/member'), { organizationId: ORG_B }));
    await assertSucceeds(updateDoc(doc(as('member'), 'team/member'), { name: 'New Name' }));
  });

  it('lets Admins invite members to their org but not grant Owner', async () => {
    await assertSucceeds(setDoc(doc(as('admin'), 'team/usr-1'), { role: 'Manager', organizationId: ORG_A }));
    await assertFails(setDoc(doc(as('admin'), 'team/usr-2'), { role: 'Owner', organizationId: ORG_A }));
    await assertFails(setDoc(doc(as('admin'), 'team/usr-3'), { role: 'Member', organizationId: ORG_B }));
  });

  it('forbids Members from inviting', async () => {
    await assertFails(setDoc(doc(as('member'), 'team/usr-4'), { role: 'Member', organizationId: ORG_A }));
  });

  it('lets Owners grant Owner', async () => {
    await assertSucceeds(updateDoc(doc(as('owner'), 'team/admin'), { role: 'Owner' }));
  });

  it('prevents Admins from modifying or removing an Owner', async () => {
    await assertFails(updateDoc(doc(as('admin'), 'team/owner'), { role: 'Member' }));
    await assertFails(deleteDoc(doc(as('admin'), 'team/owner')));
  });
});
