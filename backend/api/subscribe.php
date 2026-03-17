<?php
/**
 * PWA Notification Subscribe Endpoint
 * POST /api/subscribe.php
 * 
 * Body:
 * {
 *   "type": "fcm|webpush",
 *   "uid": "user_id",
 *   "token": "fcm_token" | (for FCM)
 *   "subscription": {
 *     "endpoint": "...",
 *     "keys": { "p256dh": "...", "auth": "..." }
 *   } | (for webpush)
 * }
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

// CORS headers
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
    
    // Parse request body
    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);
    
    if (!is_array($input)) {
        throw new Exception('Invalid JSON input');
    }

    $type = $input['type'] ?? null;
    $uid = $input['uid'] ?? null;

    if (!$type || !$uid) {
        throw new Exception('Missing required fields: type, uid');
    }

    if (!in_array($type, ['fcm', 'webpush'])) {
        throw new Exception('Invalid subscription type');
    }

    // Create table if not exists
    createSubscriptionTables($db);

    $response = [];

    if ($type === 'fcm') {
        $response = handleFCMSubscription($db, $uid, $input);
    } elseif ($type === 'webpush') {
        $response = handleWebPushSubscription($db, $uid, $input);
    }

    http_response_code(200);
    echo json_encode(array_merge(['success' => true], $response));

} catch (Exception $e) {
    error_log('Subscribe Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

function createSubscriptionTables(\mysqli $db)
{
    // FCM tokens table
    $fcmTable = <<<SQL
    CREATE TABLE IF NOT EXISTS fcm_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        device_token VARCHAR(500) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_token (device_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    SQL;

    if (!$db->query($fcmTable)) {
        throw new Exception('Failed to create FCM table: ' . $db->error);
    }

    // Web Push subscriptions table
    $webpushTable = <<<SQL
    CREATE TABLE IF NOT EXISTS webpush_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        endpoint VARCHAR(1000) NOT NULL UNIQUE,
        auth_key VARCHAR(50),
        p256dh_key VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_endpoint (endpoint(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    SQL;

    if (!$db->query($webpushTable)) {
        throw new Exception('Failed to create WebPush table: ' . $db->error);
    }
}

function handleFCMSubscription(\mysqli $db, string $uid, array $input): array
{
    $token = $input['token'] ?? null;

    if (!$token) {
        throw new Exception('FCM token required');
    }

    $stmt = $db->prepare(
        'INSERT INTO fcm_subscriptions (user_id, device_token)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP'
    );

    if (!$stmt) {
        throw new Exception('Failed to prepare FCM upsert: ' . $db->error);
    }

    $stmt->bind_param('ss', $uid, $token);
    if (!$stmt->execute()) {
        throw new Exception('Failed to save FCM token: ' . $stmt->error);
    }
    $stmt->close();

    return ['message' => 'FCM subscription saved', 'type' => 'fcm'];
}

function handleWebPushSubscription(\mysqli $db, string $uid, array $input): array
{
    $subscription = $input['subscription'] ?? null;

    if (!$subscription || !isset($subscription['endpoint']) || !isset($subscription['keys'])) {
        throw new Exception('WebPush subscription object required with endpoint and keys');
    }

    $endpoint = $subscription['endpoint'];
    $keys = $subscription['keys'];
    $auth = $keys['auth'] ?? null;
    $p256dh = $keys['p256dh'] ?? null;

    if (!$auth || !$p256dh) {
        throw new Exception('Missing required keys: auth, p256dh');
    }

    $stmt = $db->prepare(
        'INSERT INTO webpush_subscriptions (user_id, endpoint, auth_key, p256dh_key)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           auth_key = VALUES(auth_key),
           p256dh_key = VALUES(p256dh_key),
           updated_at = CURRENT_TIMESTAMP'
    );

    if (!$stmt) {
        throw new Exception('Failed to prepare WebPush upsert: ' . $db->error);
    }

    $stmt->bind_param('ssss', $uid, $endpoint, $auth, $p256dh);
    if (!$stmt->execute()) {
        throw new Exception('Failed to save WebPush subscription: ' . $stmt->error);
    }
    $stmt->close();

    return ['message' => 'WebPush subscription saved', 'type' => 'webpush'];
}
