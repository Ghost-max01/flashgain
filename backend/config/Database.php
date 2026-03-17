<?php
/**
 * Database Connection Manager
 */

class Database
{
    private static $instance = null;
    private $connection;
    private $config;

    private function __construct($config)
    {
        $this->config = $config;
        $this->connect();
    }

    public static function getInstance($config)
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    private function connect()
    {
        $db = $this->config['database'];
        
        try {
            $this->connection = new mysqli(
                $db['host'],
                $db['user'],
                $db['password'],
                $db['name'],
                $db['port']
            );

            if ($this->connection->connect_error) {
                throw new Exception('Database connection failed: ' . $this->connection->connect_error);
            }

            $this->connection->set_charset('utf8mb4');
        } catch (Exception $e) {
            error_log('Database Error: ' . $e->getMessage());
            throw $e;
        }
    }

    public function getConnection()
    {
        return $this->connection;
    }

    public function query($sql, $types = '', ...$params)
    {
        if ($types) {
            $stmt = $this->connection->prepare($sql);
            if (!$stmt) {
                throw new Exception('Prepare failed: ' . $this->connection->error);
            }
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            return $stmt;
        } else {
            return $this->connection->query($sql);
        }
    }

    public function escape($value)
    {
        return $this->connection->real_escape_string($value);
    }

    public function close()
    {
        if ($this->connection) {
            $this->connection->close();
        }
    }

    public function __destruct()
    {
        $this->close();
    }
}
