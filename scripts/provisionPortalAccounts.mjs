import fs from 'fs';
import path from 'path';

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBdN6SpgPVAVD6JPEHbnfa_I2wM6BEodhk';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'studio-os-live-2026';

const manifest = JSON.parse(fs.readFileSync(path.resolve('portal-credentials-manifest.json'), 'utf8'));

// Convert JS object to Firestore REST document field format
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: val.toString() };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return { integerValue: item.toString() };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: JSON.stringify(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

async function writeFirestoreDoc(idToken, documentPath, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${documentPath}`;
  const fields = toFirestoreFields(data);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore PATCH failed for ${documentPath} (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function signInUser(email, password) {
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sign in failed for ${email}: ${JSON.stringify(data.error)}`);
  }
  return { uid: data.localId, idToken: data.idToken };
}

async function run() {
  console.log('=== SYNCING PORTAL USER PROFILES TO CLOUD FIRESTORE ===');
  console.log(`Firebase Project: ${PROJECT_ID}\n`);

  const now = new Date().toISOString();

  // 1. Sign in Master Admin
  const masterEntry = manifest.find(a => a.role === 'platform_master_admin');
  console.log(`[1/3] Authenticating Master Admin (${masterEntry.email})...`);
  const masterAuth = await signInUser(masterEntry.email, masterEntry.temporaryPassword);
  masterEntry.uid = masterAuth.uid;
  console.log(`  -> Master Admin authenticated! UID: ${masterAuth.uid}`);

  // Write users/{uid} for Master Admin
  await writeFirestoreDoc(masterAuth.idToken, `users/${masterAuth.uid}`, {
    uid: masterAuth.uid,
    username: masterEntry.username,
    email: masterEntry.email,
    displayName: masterEntry.displayName,
    role: 'platform_master_admin',
    portal: 'Master Admin',
    accountType: 'MASTER_ADMIN',
    studioId: null,
    employeeId: null,
    designation: masterEntry.designation,
    department: masterEntry.department,
    isActive: true,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  });
  console.log(`  -> Written users/${masterAuth.uid}`);

  // Write masterAdmins/{uid}
  await writeFirestoreDoc(masterAuth.idToken, `masterAdmins/${masterAuth.uid}`, {
    adminId: masterAuth.uid,
    email: masterEntry.email,
    username: masterEntry.username,
    displayName: masterEntry.displayName,
    role: 'platform_master_admin',
    permissions: ['ALL_STUDIOS_READ', 'ALL_STUDIOS_WRITE', 'SUBSCRIPTIONS_MANAGE', 'ROLES_MANAGE', 'SETTINGS_MANAGE'],
    isActive: true,
    updatedAt: now
  });
  console.log(`  -> Written masterAdmins/${masterAuth.uid}`);

  // 2. Sign in Studio Owner (Aarav Patel)
  const ownerEntry = manifest.find(a => a.role === 'studio_owner');
  console.log(`\n[2/3] Authenticating Studio Owner (${ownerEntry.email})...`);
  const ownerAuth = await signInUser(ownerEntry.email, ownerEntry.temporaryPassword);
  ownerEntry.uid = ownerAuth.uid;
  console.log(`  -> Studio Owner authenticated! UID: ${ownerAuth.uid}`);

  // Write users/{uid} for Studio Owner
  await writeFirestoreDoc(ownerAuth.idToken, `users/${ownerAuth.uid}`, {
    uid: ownerAuth.uid,
    username: ownerEntry.username,
    email: ownerEntry.email,
    displayName: ownerEntry.displayName,
    role: 'studio_owner',
    portal: 'Studio Owner',
    accountType: 'STUDIO_OWNER',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    employeeId: null,
    designation: ownerEntry.designation,
    department: ownerEntry.department,
    isActive: true,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  });
  console.log(`  -> Written users/${ownerAuth.uid}`);

  // Write studios/studio_shreeji_films/members/{uid}
  await writeFirestoreDoc(ownerAuth.idToken, `studios/studio_shreeji_films/members/${ownerAuth.uid}`, {
    uid: ownerAuth.uid,
    email: ownerEntry.email,
    username: ownerEntry.username,
    displayName: ownerEntry.displayName,
    role: 'owner',
    membershipType: 'OWNER',
    status: 'active',
    isActive: true,
    updatedAt: now
  });
  console.log(`  -> Written studios/studio_shreeji_films/members/${ownerAuth.uid}`);

  // 3. For each of the 14 employees:
  console.log(`\n[3/3] Authenticating and syncing all 14 employees...`);
  const employees = manifest.filter(a => a.role !== 'platform_master_admin' && a.role !== 'studio_owner');

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    console.log(`\n  (${i+1}/14) Processing [${emp.displayName}] (${emp.email})...`);

    // Authenticate employee
    const empAuth = await signInUser(emp.email, emp.temporaryPassword);
    emp.uid = empAuth.uid;
    console.log(`    -> Employee authenticated! UID: ${empAuth.uid}`);

    // Employee writes to own users/{uid}
    await writeFirestoreDoc(empAuth.idToken, `users/${empAuth.uid}`, {
      uid: empAuth.uid,
      username: emp.username,
      email: emp.email,
      displayName: emp.displayName,
      role: emp.role,
      portal: 'Employee',
      accountType: 'EMPLOYEE',
      studioId: 'studio_shreeji_films',
      studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
      employeeId: emp.employeeId,
      designation: emp.designation,
      department: emp.department,
      isActive: true,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    });
    console.log(`    -> Written users/${empAuth.uid}`);

    // Studio Owner writes to studios/studio_shreeji_films/members/{uid}
    await writeFirestoreDoc(ownerAuth.idToken, `studios/studio_shreeji_films/members/${empAuth.uid}`, {
      uid: empAuth.uid,
      email: emp.email,
      username: emp.username,
      displayName: emp.displayName,
      role: emp.role,
      employeeId: emp.employeeId,
      membershipType: 'EMPLOYEE',
      status: 'active',
      isActive: true,
      updatedAt: now
    });
    console.log(`    -> Written studios/studio_shreeji_films/members/${empAuth.uid}`);

    // Studio Owner updates studios/studio_shreeji_films/employees/{employeeId}
    await writeFirestoreDoc(ownerAuth.idToken, `studios/studio_shreeji_films/employees/${emp.employeeId}`, {
      id: emp.employeeId,
      authUid: empAuth.uid,
      email: emp.email,
      username: emp.username,
      fullName: emp.displayName,
      designation: emp.designation,
      department: emp.department,
      employmentStatus: 'active',
      mustChangePassword: true,
      updatedAt: now
    });
    console.log(`    -> Linked studios/studio_shreeji_films/employees/${emp.employeeId}`);

    emp.authStatus = 'Active & Verified';
    emp.firestoreProfileStatus = 'Synced (users, members, employees)';
  }

  masterEntry.authStatus = 'Active & Verified';
  masterEntry.firestoreProfileStatus = 'Synced (users, masterAdmins)';

  ownerEntry.authStatus = 'Active & Verified';
  ownerEntry.firestoreProfileStatus = 'Synced (users, members)';

  // Re-write final manifest
  fs.writeFileSync(path.resolve('portal-credentials-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n======================================================');
  console.log('ALL 16 ACCOUNTS SUCCESSFULLY PROVISIONED AND SYNCED TO FIREBASE!');
  console.log('======================================================\n');
}

run().catch(console.error);
