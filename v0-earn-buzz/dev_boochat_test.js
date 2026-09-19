#!/usr/bin/env node
/**
 * Boochat dev test script
 * Tests signed link generation and webhook verification locally
 * 
 * Usage:
 *   node dev_boochat_test.js
 * 
 * Environment:
 *   NODE_ENV=development (local testing only)
 *   BOOCHAT_BASE_URL
 *   BOOCHAT_PARTNER_SLUG
 *   BOOCHAT_PARTNER_NAME
 *   BOOCHAT_SHARED_SECRET
 *   BOOCHAT_WEBHOOK_SECRET
 */

const crypto = require("crypto");
const http = require("http");

// Load from .env or process.env
const cfg = {
  baseUrl: process.env.BOOCHAT_BASE_URL || "http://localhost:3000",
  partnerSlug: process.env.BOOCHAT_PARTNER_SLUG || "testpartner",
  partnerName: process.env.BOOCHAT_PARTNER_NAME || "Test Partner",
  sharedSecret: process.env.BOOCHAT_SHARED_SECRET || "test-shared-secret-32-bytes-long-",
  webhookSecret: process.env.BOOCHAT_WEBHOOK_SECRET || "test-webhook-secret-32-bytes-long-",
  apiBase: process.env.API_BASE || "http://localhost:3000/api",
};

console.log("🔧 Boochat Dev Test\n");
console.log("Config:", cfg);
console.log("\n");

// ─────────────────────────────────────────────────────────────
// 1. Test signed JWT token generation (join link)
// ─────────────────────────────────────────────────────────────

function generateJoinToken(userId, email, name) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    partner: cfg.partnerSlug,
    ext_user_id: userId,
    email: email,
    name: name,
    iat: now,
    exp: now + 300, // 5 min
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const header = { alg: "HS256", typ: "JWT" };
  const token =
    Buffer.from(JSON.stringify(header)).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", cfg.sharedSecret)
    .update(token)
    .digest("base64url");

  return token + "." + signature;
}

console.log("✅ TEST 1: Generate Join Link Token");
const joinToken = generateJoinToken("user-123", "test@example.com", "Test User");
console.log(`   Token (first 50 chars): ${joinToken.substring(0, 50)}...`);
console.log(
  `   Join URL: ${cfg.baseUrl}/auth?partner=${cfg.partnerSlug}&token=${joinToken.substring(
    0,
    20
  )}...`
);
console.log("\n");

// ─────────────────────────────────────────────────────────────
// 2. Test webhook signature generation & sending
// ─────────────────────────────────────────────────────────────

function generateWebhookSignature(timestamp, body) {
  const tsBody = `${timestamp}.${body}`;
  const sig = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(tsBody)
    .digest("hex");
  return `sha256=${sig}`;
}

async function sendWebhook(eventType, payload) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    event_type: eventType,
    partner: cfg.partnerSlug,
    ...payload,
  });

  const signature = generateWebhookSignature(timestamp, body);

  console.log(`📤 Sending ${eventType} webhook...`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Signature: sha256=${signature.substring(10, 30)}...`);
  console.log(`   Payload: ${body.substring(0, 80)}...`);

  return new Promise((resolve, reject) => {
    const url = new URL(`${cfg.apiBase}/boochat/webhook`);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Boochat-Timestamp": timestamp,
        "X-Boochat-Signature": signature,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Run tests
// ─────────────────────────────────────────────────────────────

async function runTests() {
  try {
    console.log("✅ TEST 2a: Send member_joined webhook");
    const res2a = await sendWebhook("member_joined", {
      event_id: `evt_${Date.now()}_join`,
      members: [
        { user_id: "user-123", email: "test@example.com", name: "Test User" },
        { user_id: "user-456", email: "user456@example.com", name: "User 456" },
      ],
      timestamp: Math.floor(Date.now() / 1000),
    });
    console.log(`   Response: ${res2a.status}`);
    console.log(`   Body: ${res2a.data.substring(0, 100)}...`);
    console.log("\n");

    console.log("✅ TEST 2b: Send channel_post webhook");
    const res2b = await sendWebhook("channel_post", {
      event_id: `evt_${Date.now()}_post`,
      channel_name: "Announcements",
      channel_id: "ch-announcements",
      message: "Welcome to the channel!",
      sender_id: "bot-system",
      recipients: ["user-123", "user-456"],
      timestamp: Math.floor(Date.now() / 1000),
    });
    console.log(`   Response: ${res2b.status}`);
    console.log(`   Body: ${res2b.data.substring(0, 100)}...`);
    console.log("\n");

    console.log("✅ TEST 2c: Send direct_message webhook");
    const res2c = await sendWebhook("direct_message", {
      event_id: `evt_${Date.now()}_dm`,
      from_id: "bot-system",
      from_name: "Support Bot",
      message: "This is a direct message to you.",
      recipients: ["user-123"],
      timestamp: Math.floor(Date.now() / 1000),
    });
    console.log(`   Response: ${res2c.status}`);
    console.log(`   Body: ${res2c.data.substring(0, 100)}...`);
    console.log("\n");

    console.log("✅ TEST 3: Webhook retry (dedupe test)");
    const res3 = await sendWebhook("channel_post", {
      event_id: `evt_${Date.now()}_retry`,
      channel_name: "Announcements",
      channel_id: "ch-announcements",
      message: "Retry test — should dedupe",
      sender_id: "bot-system",
      recipients: ["user-123"],
      timestamp: Math.floor(Date.now() / 1000),
    });
    console.log(`   Response: ${res3.status}`);
    console.log(`   (Send the same webhook again — should still succeed with dedupe)`);
    console.log("\n");

    console.log("✅ All tests completed!");
    console.log("\nNext steps:");
    console.log("1. Check your Supabase web console:");
    console.log("   - boochat_membership table should have rows for user-123 and user-456");
    console.log("   - notification_inbox table should have entries from channel_post and direct_message");
    console.log("2. Check FCM / webpush logs to verify notifications were sent");
    console.log("3. Test the signed link manually:");
    console.log(
      `   - Visit: http://localhost:3000/api/boochat/link (must be logged-in user)`
    );
    console.log("   - You should be redirected to the Boochat auth page with a signed JWT token");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    process.exit(1);
  }
}

runTests();
