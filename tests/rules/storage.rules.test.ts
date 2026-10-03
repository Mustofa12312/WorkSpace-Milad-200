/**
 * Cloud Storage security rules tests — run with `npm run test:rules`.
 * Storage rules look up team membership in Firestore, so both emulators run.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes, uploadString } from 'firebase/storage';

const ORG_A = 'default-org-1';
const ORG_B = 'other-org';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-milad',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'team/member'), { role: 'Member', organizationId: ORG_A });
    await setDoc(doc(ctx.firestore(), 'team/admin'), { role: 'Admin', organizationId: ORG_A });
    await uploadString(ref(ctx.storage(), `orgs/${ORG_A}/documents/existing.txt`), 'hello');
    await uploadString(ref(ctx.storage(), `orgs/${ORG_B}/documents/secret.txt`), 'secret');
  });
});

const storageAs = (uid: string) => env.authenticatedContext(uid).storage();
const small = new Uint8Array([1, 2, 3]);

describe('storage rules', () => {
  it('denies unauthenticated access', async () => {
    const s = env.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(s, `orgs/${ORG_A}/documents/existing.txt`)));
    await assertFails(uploadBytes(ref(s, `orgs/${ORG_A}/documents/x.txt`), small));
  });

  it('allows members to read and upload documents in their org', async () => {
    const s = storageAs('member');
    await assertSucceeds(getBytes(ref(s, `orgs/${ORG_A}/documents/existing.txt`)));
    await assertSucceeds(uploadBytes(ref(s, `orgs/${ORG_A}/documents/new.txt`), small));
  });

  it('denies access to another org', async () => {
    const s = storageAs('member');
    await assertFails(getBytes(ref(s, `orgs/${ORG_B}/documents/secret.txt`)));
    await assertFails(uploadBytes(ref(s, `orgs/${ORG_B}/documents/x.txt`), small));
  });

  it('rejects documents over 25 MB', async () => {
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(storageAs('member'), `orgs/${ORG_A}/documents/big.bin`), big));
  });

  it('accepts only audio for recordings', async () => {
    const s = storageAs('member');
    await assertSucceeds(
      uploadBytes(ref(s, `orgs/${ORG_A}/recordings/m.webm`), small, { contentType: 'audio/webm' }),
    );
    await assertFails(
      uploadBytes(ref(s, `orgs/${ORG_A}/recordings/m.exe`), small, { contentType: 'application/octet-stream' }),
    );
  });

  it('restricts deletes to Owner/Admin', async () => {
    await assertFails(deleteObject(ref(storageAs('member'), `orgs/${ORG_A}/documents/existing.txt`)));
    await assertSucceeds(deleteObject(ref(storageAs('admin'), `orgs/${ORG_A}/documents/existing.txt`)));
  });

  it('denies paths outside orgs/{orgId}/...', async () => {
    await assertFails(uploadBytes(ref(storageAs('admin'), 'documents/legacy.txt'), small));
  });
});
