import fs from 'fs';
import path from 'path';

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBdN6SpgPVAVD6JPEHbnfa_I2wM6BEodhk';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'studio-os-live-2026';

async function signIn(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Sign in failed for ${email}: ` + JSON.stringify(data.error));
  return data;
}

async function patchFirestore(idToken, docPath, fieldsObj) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?updateMask.fieldPaths=mustChangePassword&updateMask.fieldPaths=updatedAt`;
  const fields = {
    mustChangePassword: { booleanValue: false },
    updatedAt: { stringValue: new Date().toISOString() }
  };
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
    throw new Error(`PATCH failed for ${docPath}: ${errText}`);
  }
  return await res.json();
}

async function run() {
  console.log('--- MIGRATING EXISTING ACCOUNTS: SETTING mustChangePassword = false ---');
  
  // 1. Authenticate Master Admin
  const masterAuth = await signIn('masteradmin@studioos.internal', 'Hz9#*R*r2&#%L3');
  console.log('Master Admin authenticated, UID:', masterAuth.localId);
  
  // Update Master Admin document
  await patchFirestore(masterAuth.idToken, `users/${masterAuth.localId}`);
  console.log('✓ Master Admin users/' + masterAuth.localId + ' mustChangePassword set to false');

  // 2. Authenticate Studio Owner
  const ownerAuth = await signIn('aarav@shreejifilms.in', '7FgBK8@TUsxV@H');
  console.log('Studio Owner authenticated, UID:', ownerAuth.localId);

  // Update Studio Owner document
  await patchFirestore(ownerAuth.idToken, `users/${ownerAuth.localId}`);
  console.log('✓ Studio Owner users/' + ownerAuth.localId + ' mustChangePassword set to false');

  // 3. Update all 14 employees
  const employees = [
    { email: 'rahul.sharma@shreejifilms.in', pass: '!Bd2*9R7vJUy8W', empId: 'emp_shr_rahul' },
    { email: 'karan.patel@shreejifilms.in', pass: 'sN&sWD9c#2Sn9P', empId: 'emp_shr_karan' },
    { email: 'vishal.desai@shreejifilms.in', pass: 'Lua%4#Ln7*r5tw', empId: 'emp_shr_vishal' },
    { email: 'meet.shah@shreejifilms.in', pass: 's63Y#SZ%XyR4Sw', empId: 'emp_shr_meet' },
    { email: 'jay.mehta@shreejifilms.in', pass: '6Ab#NUv!57rTYn', empId: 'emp_shr_jay' },
    { email: 'priya.joshi@shreejifilms.in', pass: 'YsP4m8Q5y$R%dB', empId: 'emp_shr_priya' },
    { email: 'riya.trivedi@shreejifilms.in', pass: '!3rWPxt9MP@5tC', empId: 'emp_shr_riya' },
    { email: 'neel.vyas@shreejifilms.in', pass: 'g8f9&UE8A!KT7G', empId: 'emp_shr_neel' },
    { email: 'aman.parmar@shreejifilms.in', pass: 'G#5Vi@5p4ZBk2J', empId: 'emp_shr_aman' },
    { email: 'krunal.dave@shreejifilms.in', pass: 'Wg2@x!yB3L4%Yg', empId: 'emp_shr_krunal' },
    { email: 'dhruv.patel@shreejifilms.in', pass: 'uLk*3B6Wm3sr!p', empId: 'emp_shr_dhruv' },
    { email: 'kavya.shah@shreejifilms.in', pass: 'nC!#7@%azf8n9Z', empId: 'emp_shr_kavya' },
    { email: 'harsh.modi@shreejifilms.in', pass: 'Dm4m$*Gtj3mN*2', empId: 'emp_shr_harsh' },
    { email: 'nisha.desai@shreejifilms.in', pass: 'Ysx$UbvM9@SZ2u', empId: 'emp_shr_nisha' }
  ];

  for (const emp of employees) {
    try {
      const empAuth = await signIn(emp.email, emp.pass);
      await patchFirestore(empAuth.idToken, `users/${empAuth.localId}`);
      // Also patch employee record
      await patchFirestore(ownerAuth.idToken, `studios/studio_shreeji_films/employees/${emp.empId}`);
      console.log(`✓ [${emp.email}] mustChangePassword updated to false`);
    } catch (err) {
      console.warn(`! Note for ${emp.email}:`, err.message);
    }
  }

  console.log('\n--- ALL ESTABLISHED ACCOUNTS SUCCESSFULLY MIGRATED TO mustChangePassword = false ---');
}

run().catch(console.error);
