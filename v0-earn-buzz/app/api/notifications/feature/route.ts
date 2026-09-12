import { NextResponse } from "next/server"

function isAdmin(req: Request) {
  const secret = process.env.ADMIN_NOTIFY_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const { title, body, url, version } = await request.json()

    // In a real implementation, you would:
    // 1. Validate the request
    // 2. Store the notification in a database
    // 3. Trigger push notifications to subscribed users

    // For demo purposes, we're just returning success
    return NextResponse.json({
      success: true,
      message: "Feature notification created successfully",
      notification: { title, body, url, version },
    })
  } catch (error) {
    console.error("Error creating feature notification:", error)
    return NextResponse.json({ success: false, message: "Failed to create feature notification" }, { status: 500 })
  }
}
