import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || ""
  return raw.replace(/\\n/g, "\n")
}

function getFirebaseAdminApp(): App {
  const apps = getApps();
  if (apps.length) {
    return apps[0]
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = getPrivateKey()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars")
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

export function getFirebaseMessaging() {
  return getMessaging(getFirebaseAdminApp())
}
