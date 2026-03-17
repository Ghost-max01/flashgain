<?php
/**
 * Firebase Cloud Messaging Helper (HTTP v1)
 */

class FCMHelper
{
    private $projectId;
    private $clientEmail;
    private $privateKey;
    private $tokenUri;
    private $apiBaseUrl;

    public function __construct(array $firebaseConfig)
    {
        $this->projectId = $firebaseConfig['projectId'] ?? null;
        $this->clientEmail = $firebaseConfig['clientEmail'] ?? null;
        $this->privateKey = $firebaseConfig['privateKey'] ?? null;
        $this->tokenUri = $firebaseConfig['tokenUri'] ?? 'https://oauth2.googleapis.com/token';
        $this->apiBaseUrl = rtrim($firebaseConfig['apiUrl'] ?? 'https://fcm.googleapis.com/v1/projects', '/');
    }

    public function sendNotification($token, $payload)
    {
        try {
            if (!$this->projectId || !$this->clientEmail || !$this->privateKey) {
                throw new Exception('FCM HTTP v1 config missing (projectId/clientEmail/privateKey)');
            }

            $accessToken = $this->getAccessToken();
            $url = $this->apiBaseUrl . '/' . $this->projectId . '/messages:send';

            $body = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $payload['title'] ?? 'Notification',
                        'body' => $payload['body'] ?? '',
                    ],
                    'webpush' => [
                        'notification' => [
                            'title' => $payload['title'] ?? 'Notification',
                            'body' => $payload['body'] ?? '',
                            'icon' => $payload['icon'] ?? '/icons/icon-192x192.png',
                        ],
                        'fcm_options' => [
                            'link' => $payload['clickUrl'] ?? '/',
                        ],
                    ],
                    'android' => [
                        'priority' => 'HIGH',
                    ],
                ],
            ];

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($body),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $accessToken,
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_TIMEOUT => 15,
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                throw new Exception('FCM HTTP request failed: ' . $curlError);
            }

            $result = json_decode($response, true);

            if ($httpCode >= 200 && $httpCode < 300) {
                return ['success' => true, 'response' => $result];
            }

            $errorStatus = $result['error']['status'] ?? '';
            $errorMessage = $result['error']['message'] ?? 'Unknown FCM v1 error';

            if (in_array($errorStatus, ['UNREGISTERED', 'INVALID_ARGUMENT'], true)) {
                return [
                    'success' => false,
                    'invalidToken' => true,
                    'error' => $errorMessage,
                    'status' => $errorStatus,
                ];
            }

            return [
                'success' => false,
                'error' => $errorMessage,
                'status' => $errorStatus,
                'httpCode' => $httpCode,
            ];
        } catch (Exception $e) {
            error_log('FCM v1 Error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function getAccessToken()
    {
        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $this->clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => $this->tokenUri,
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $unsignedJwt = $header . '.' . $payload;

        $privateKey = trim($this->privateKey);
        $privateKey = trim($privateKey, '"');
        $privateKey = str_replace('\\n', "\n", $privateKey);
        $signature = '';
        $ok = openssl_sign($unsignedJwt, $signature, $privateKey, 'sha256');
        if (!$ok) {
            throw new Exception('Unable to sign Google OAuth JWT');
        }

        $jwt = $unsignedJwt . '.' . $this->base64UrlEncode($signature);

        $postFields = http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        $ch = curl_init($this->tokenUri);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postFields,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 15,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new Exception('OAuth token request failed: ' . $curlError);
        }

        $tokenData = json_decode($response, true);

        if ($httpCode < 200 || $httpCode >= 300 || empty($tokenData['access_token'])) {
            throw new Exception('Failed to obtain Google OAuth access token');
        }

        return $tokenData['access_token'];
    }

    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
