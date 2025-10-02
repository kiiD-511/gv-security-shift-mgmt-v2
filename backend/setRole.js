// setRole.js
const admin = require("firebase-admin");
const serviceAccount =require("./firebase-service-account.json");


// initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(require("./firebase-service-account.json"))
});

// usage: node setRole.js <uid> <role>
const [,, uid, role] = process.argv;
if (!uid || !role) {
  console.log("Usage: node setRole.js <uid> <admin|supervisor|guard>");
  process.exit(1);
}
async function setRole(uid, role) {
  await admin.auth().setCustomUserClaims(uid, { role });
  console.log(`✅ Set role=${role} for user ${uid}`);
}




setRole(uid, role).then(()=>process.exit());
