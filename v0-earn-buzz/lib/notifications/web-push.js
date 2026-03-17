const nodeRequire = eval("require")
const webpush = nodeRequire("web-push")

let vapidConfigured = false

export function configureWebPush() {
  if (vapidConfigured) {
    return
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing VAPID env vars")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export { webpush }
