// Boochat configuration loader & validator
export function getBoochatConfig() {
  const baseUrl = process.env.BOOCHAT_BASE_URL || ""
  const partnerSlug = process.env.BOOCHAT_PARTNER_SLUG || ""
  const partnerName = process.env.BOOCHAT_PARTNER_NAME || ""
  const sharedSecret = process.env.BOOCHAT_SHARED_SECRET || ""
  const webhookSecret = process.env.BOOCHAT_WEBHOOK_SECRET || ""

  if (!baseUrl) throw new Error("Missing BOOCHAT_BASE_URL in environment")
  if (!partnerSlug) throw new Error("Missing BOOCHAT_PARTNER_SLUG in environment")
  if (!partnerName) throw new Error("Missing BOOCHAT_PARTNER_NAME in environment")
  if (!sharedSecret) throw new Error("Missing BOOCHAT_SHARED_SECRET in environment")
  if (!webhookSecret) throw new Error("Missing BOOCHAT_WEBHOOK_SECRET in environment")

  // Normalize: no trailing slash on baseUrl
  const base = baseUrl.replace(/\/$/, "")

  return {
    baseUrl: base,
    partnerSlug: partnerSlug,
    partnerName: partnerName,
    sharedSecret: sharedSecret,
    webhookSecret: webhookSecret,
  }
}

export function getBoochatHost() {
  try {
    const { baseUrl } = getBoochatConfig()
    return new URL(baseUrl).host
  } catch {
    return ""
  }
}
