<?php
/**
 * PWA Notification Send Endpoint
 * POST /api/send.php
 * 
 * Body:
 * {
 *   "uid": "user_id",
 *   "title": "Notification Title",
 *   "body": "Notification body",
 *   "icon": "/icons/icon-192x192.png",
 *   "badge": "/icons/badge-96x96.png",
 *   "clickUrl": "/path"
 * }
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../lib/FCMHelper.php';
require_once __DIR__ . '/../lib/WebPushHelper.php';

if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

header('Access-Control-Allow-Origin: ' . (getenv('BASE_URL') ?: 'http://localhost:3000'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $config = require __DIR__ . '/../config/config.php';
    $db = Database::getInstance($config)->getConnection();
    
    // Parse request
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }

    $uid = $input['uid'] ?? null;

    if (!$uid) {
        throw new Exception('Missing user ID');
    }

    // Build payload
    $payload = [
        'title' => $input['title'] ?? 'Notification',
        'body' => $input['body'] ?? '',
        'icon' => $input['icon'] ?? $config['notification']['defaults']['icon'],
        'badge' => $input['badge'] ?? $config['notification']['defaults']['badge'],
        'clickUrl' => $input['clickUrl'] ?? $config['notification']['defaults']['clickUrl'],
    ];

    $stats = [
        'fcmAttempted' => 0,
        'fcmSent' => 0,
        'fcmFailed' => 0,
        'webpushAttempted' => 0,
        'webpushSent' => 0,
        'webpushFailed' => 0,
        'cleaned' => 0,
    ];

    // Send to FCM subscriptions
    $stats = array_merge($stats, sendToFCMSubscriptions($db, $uid, $payload, $config));

    // Send to WebPush subscriptions
    $stats = array_merge($stats, sendToWebPushSubscriptions($db, $uid, $payload, $config));

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'stats' => $stats,
    ]);

} catch (Exception $e) {
    error_log('Send Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

function sendToFCMSubscriptions(\mysqli $db, string $uid, array $payload, array $config): array
{
    $stats = [
        'fcmAttempted' => 0,
        'fcmSent' => 0,
        'fcmFailed' => 0,
    ];

    if (empty($config['firebase']['projectId']) || empty($config['firebase']['clientEmail']) || empty($config['firebase']['privateKey'])) {
        return $stats;
    }

    $fcm = new FCMHelper($config['firebase']);

    // Get all FCM tokens for this user
    $escapedUid = $db->real_escape_string($uid);
    $result = $db->query("SELECT device_token FROM fcm_subscriptions WHERE user_id = '$escapedUid'");

    if (!$result) {
        error_log('Query error: ' . $db->error);
        return $stats;
    }

    $toDelete = [];

    while ($row = $result->fetch_assoc()) {
        $token = $row['device_token'];
        $stats['fcmAttempted']++;

        $response = $fcm->sendNotification($token, $payload);

        if ($response['success']) {
            $stats['fcmSent']++;
        } else {
            $stats['fcmFailed']++;
            
            // Mark invalid tokens for deletion
            if ($response['invalidToken'] ?? false) {
                $toDelete[] = $token;
            }
        }
    }

    // Clean up invalid tokens
    foreach ($toDelete as $token) {
        $escapedToken = $db->real_escape_string($token);
        $db->query("DELETE FROM fcm_subscriptions WHERE device_token = '$escapedToken'");
        $stats['cleaned']++;
    }

    return $stats;
}

function sendToWebPushSubscriptions(\mysqli $db, string $uid, array $payload, array $config): array
{
    $stats = [
        'webpushAttempted' => 0,
        'webpushSent' => 0,
        'webpushFailed' => 0,
    ];

    if (!$config['vapid']['privateKey'] || !$config['vapid']['publicKey']) {
        return $stats;
    }

    $webpush = new WebPushHelper($config);

    // Get all WebPush subscriptions for this user
    $escapedUid = $db->real_escape_string($uid);
    $result = $db->query("SELECT id, endpoint, auth_key, p256dh_key FROM webpush_subscriptions WHERE user_id = '$escapedUid'");

    if (!$result) {
        error_log('Query error: ' . $db->error);
        return $stats;
    }

    $toDelete = [];

    while ($row = $result->fetch_assoc()) {
        $endpoint = $row['endpoint'];
        $keys = [
            'auth' => $row['auth_key'],
            'p256dh' => $row['p256dh_key'],
        ];

        $stats['webpushAttempted']++;

        $response = $webpush->sendPush($endpoint, $keys, $payload);

        if ($response['success']) {
            $stats['webpushSent']++;
        } else {
            $stats['webpushFailed']++;
            
            // Mark invalid endpoints for deletion
            if ($response['invalidEndpoint'] ?? false) {
                $toDelete[] = $row['id'];
            }
        }
    }

    // Clean up invalid subscriptions
    foreach ($toDelete as $id) {
        $db->query("DELETE FROM webpush_subscriptions WHERE id = $id");
        $stats['cleaned']++;
    }

    return $stats;
}
