const nodeRequire = eval("require") as NodeRequire
const firebaseAdminApp = nodeRequire("firebase-admin/app")
const firebaseAdminMessaging = nodeRequire("firebase-admin/messaging")

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || ""
  return raw.replace(/\\n/g, "\n")
}

function getFirebaseAdminApp() {
  if (firebaseAdminApp.getApps().length) {
    return firebaseAdminApp.getApps()[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars")
  }

  return firebaseAdminApp.initializeApp({
    credential: firebaseAdminApp.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export function getFirebaseMessaging() {
  return firebaseAdminMessaging.getMessaging(getFirebaseAdminApp())
}
