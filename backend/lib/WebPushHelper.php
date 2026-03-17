<?php
/**
 * Web Push helper.
 * Strategy:
 * 1) Use Minishlink\WebPush when available.
 * 2) If unavailable or send fails due to crypto capability, fallback to Node sender.
 */

class WebPushHelper
{
    private $vapidPublicKey;
    private $vapidPrivateKey;
    private $vapidSubject;
    private $nodeFallbackEnabled;
    private $nodeFallbackPath;

    public function __construct(array $config)
    {
        $this->vapidPublicKey = $config['vapid']['publicKey'] ?? null;
        $this->vapidPrivateKey = $config['vapid']['privateKey'] ?? null;
        $this->vapidSubject = $config['vapid']['subject'] ?? null;
        $this->nodeFallbackEnabled = $config['nodeFallback']['enabled'] ?? false;
        $this->nodeFallbackPath = $config['nodeFallback']['path'] ?? null;
    }

    public function sendPush($endpoint, $keys, $payload)
    {
        $payloadJson = is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE);

        if ($this->hasPhpWebPushLibrary()) {
            $phpResult = $this->sendWithPhpLibrary($endpoint, $keys, $payloadJson);
            if ($phpResult['success'] || !$this->canUseNodeFallback()) {
                return $phpResult;
            }
        }

        if ($this->canUseNodeFallback()) {
            return $this->sendWithNodeFallback($endpoint, $keys, $payloadJson);
        }

        return [
            'success' => false,
            'error' => 'No available Web Push sender (php library missing and node fallback unavailable).',
        ];
    }

    private function hasPhpWebPushLibrary()
    {
        return class_exists('Minishlink\\WebPush\\WebPush') && class_exists('Minishlink\\WebPush\\Subscription');
    }

    private function canUseNodeFallback()
    {
        return $this->nodeFallbackEnabled && !empty($this->nodeFallbackPath) && file_exists($this->nodeFallbackPath);
    }

    private function sendWithPhpLibrary($endpoint, $keys, $payloadJson)
    {
        try {
            if (empty($this->vapidPublicKey) || empty($this->vapidPrivateKey) || empty($this->vapidSubject)) {
                return ['success' => false, 'error' => 'VAPID config missing'];
            }

            $auth = [
                'VAPID' => [
                    'subject' => $this->vapidSubject,
                    'publicKey' => $this->vapidPublicKey,
                    'privateKey' => $this->vapidPrivateKey,
                ],
            ];

            $webPushClass = 'Minishlink\\WebPush\\WebPush';
            $subscriptionClass = 'Minishlink\\WebPush\\Subscription';

            /** @var mixed $webPush */
            $webPush = new $webPushClass($auth);
            /** @var mixed $subscription */
            $subscription = $subscriptionClass::create([
                'endpoint' => $endpoint,
                'publicKey' => $keys['p256dh'] ?? '',
                'authToken' => $keys['auth'] ?? '',
            ]);

            $report = $webPush->sendOneNotification($subscription, $payloadJson);
            $statusCode = method_exists($report, 'getResponse') && $report->getResponse()
                ? $report->getResponse()->getStatusCode()
                : 0;

            if ($report->isSuccess()) {
                return ['success' => true, 'statusCode' => $statusCode ?: 201];
            }

            if (in_array($statusCode, [404, 410], true)) {
                return ['success' => false, 'statusCode' => $statusCode, 'invalidEndpoint' => true];
            }

            return [
                'success' => false,
                'statusCode' => $statusCode,
                'error' => $report->getReason() ?: 'WebPush send failed',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => 'PHP WebPush error: ' . $e->getMessage(),
            ];
        }
    }

    private function sendWithNodeFallback($endpoint, $keys, $payloadJson)
    {
        $input = [
            'endpoint' => $endpoint,
            'keys' => [
                'p256dh' => $keys['p256dh'] ?? '',
                'auth' => $keys['auth'] ?? '',
            ],
            'payload' => json_decode($payloadJson, true),
            'vapid' => [
                'publicKey' => $this->vapidPublicKey,
                'privateKey' => $this->vapidPrivateKey,
                'subject' => $this->vapidSubject,
            ],
        ];

        $command = sprintf(
            'node %s %s',
            escapeshellarg($this->nodeFallbackPath),
            escapeshellarg(json_encode($input, JSON_UNESCAPED_UNICODE))
        );

        $output = shell_exec($command);
        $decoded = $output ? json_decode($output, true) : null;

        if (is_array($decoded) && isset($decoded['success'])) {
            return $decoded;
        }

        return [
            'success' => false,
            'error' => 'Node fallback failed or returned invalid response',
            'raw' => $output,
        ];
    }
}
