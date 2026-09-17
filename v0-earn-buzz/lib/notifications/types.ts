export type NotificationSubscribePayload =
  | {
      type: "fcm"
      token: string
      uid: string
      /** Login-issued HMAC token proving uid ownership (no Supabase JWT in app). */
      notifyToken?: string
    }
  | {
      type: "webpush"
      uid: string
      /** Login-issued HMAC token proving uid ownership (no Supabase JWT in app). */
      notifyToken?: string
      subscription: {
        endpoint: string
        expirationTime?: number | null
        keys?: {
          p256dh?: string
          auth?: string
        }
      }
    }

export type NotificationSendPayload = {
  uid: string
  title?: string
  body?: string
  icon?: string
  badge?: string
  clickUrl?: string
}
