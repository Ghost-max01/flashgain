<?php
$config = require 'config/config.php';

try {
    $pdo = new PDO(
        'mysql:host=' . $config['database']['host'] . ';dbname=' . $config['database']['name'] . ';charset=utf8mb4',
        $config['database']['user'],
        $config['database']['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents('scripts/002_init_session_tracking.sql');
    $pdo->exec($sql);

    echo 'Session tracking tables created successfully!';
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>