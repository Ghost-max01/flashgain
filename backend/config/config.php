<?php
/**
 * PWA Notification System Configuration
 */

if (!function_exists('env_bool')) {
    function env_bool($key, $default = false)
    {
        $raw = getenv($key);
        if ($raw === false) {
            return $default;
        }
        return in_array(strtolower(trim($raw)), ['1', 'true', 'yes', 'on'], true);
    }
}

if (!function_exists('normalize_env_value')) {
    function normalize_env_value($value)
    {
        $value = trim($value);

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        return $value;
    }
}

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $envFile = file_get_contents(__DIR__ . '/../.env');
    foreach (explode("\n", $envFile) as $line) {
        if (!empty($line) && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = normalize_env_value($value);
            putenv("$key=$value");
        }
    }
}

return [
    'database' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'user' => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASSWORD') ?: '',
        'name' => getenv('DB_NAME') ?: 'helping_hand_notifications',
        'port' => getenv('DB_PORT') ?: 3306,
    ],
    
    'vapid' => [
        'publicKey' => getenv('VAPID_PUBLIC_KEY'),
        'privateKey' => getenv('VAPID_PRIVATE_KEY'),
        'subject' => getenv('VAPID_SUBJECT'),
    ],
    
    'firebase' => [
        'projectId' => getenv('FIREBASE_PROJECT_ID'),
        'clientEmail' => getenv('FIREBASE_CLIENT_EMAIL'),
        'privateKey' => getenv('FIREBASE_PRIVATE_KEY'),
        'tokenUri' => getenv('FIREBASE_TOKEN_URI') ?: 'https://oauth2.googleapis.com/token',
        'apiUrl' => 'https://fcm.googleapis.com/v1/projects',
    ],
    
    'app' => [
        'baseUrl' => getenv('BASE_URL') ?: 'http://localhost:3000',
        'env' => getenv('ENV') ?: 'development',
        'debug' => env_bool('DEBUG', false),
    ],
    
    'notification' => [
        'defaults' => [
            'title' => 'Helping Hands Notification',
            'icon' => '/icons/icon-192x192.png',
            'badge' => '/icons/icon-192x192.png',
            'clickUrl' => '/',
        ],
    ],
    
    'nodeFallback' => [
        'enabled' => env_bool('NODE_FALLBACK_ENABLED', false),
        'path' => getenv('NODE_FALLBACK_PATH'),
    ],
];
