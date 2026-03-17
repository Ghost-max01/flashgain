export type NotificationSubscribePayload =
  | {
      type: "fcm"
      token: string
      uid: string
    }
  | {
      type: "webpush"
      uid: string
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
