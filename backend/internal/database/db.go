package database

import (
    "database/sql"
    "fmt"
    "os"
    _ "github.com/lib/pq"
)

type DB struct {
    Conn *sql.DB
}

func Connect() (*DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        os.Getenv("DB_HOST"),
        os.Getenv("DB_PORT"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
    )

    conn, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    if err := conn.Ping(); err != nil {
        return nil, err
    }

    return &DB{Conn: conn}, nil
}