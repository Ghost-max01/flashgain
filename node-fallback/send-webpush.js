import webpush from "web-push";

function output(result) {
  process.stdout.write(JSON.stringify(result));
}

async function main() {
  try {
    const raw = process.argv[2];
    if (!raw) {
      output({ success: false, error: "Missing input payload" });
      return;
    }

    const input = JSON.parse(raw);
    const endpoint = input?.endpoint;
    const keys = input?.keys;
    const payload = input?.payload || {};
    const vapid = input?.vapid || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      output({ success: false, error: "Invalid endpoint/keys" });
      return;
    }

    if (!vapid?.publicKey || !vapid?.privateKey || !vapid?.subject) {
      output({ success: false, error: "Missing VAPID config" });
      return;
    }

    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const subscription = {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    };

    try {
      const response = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
      );

      output({
        success: true,
        statusCode: response?.statusCode || 201,
      });
    } catch (err) {
      const statusCode = err?.statusCode || 0;
      if (statusCode === 404 || statusCode === 410) {
        output({
          success: false,
          statusCode,
          invalidEndpoint: true,
          error: err?.body || "Expired endpoint",
        });
        return;
      }

      output({
        success: false,
        statusCode,
        error: err?.body || err?.message || "Web push send failed",
      });
    }
  } catch (error) {
    output({ success: false, error: error?.message || "Unexpected fallback error" });
  }
}

main();
