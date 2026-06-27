package database

import (
    "context"
    "os"
    "github.com/redis/go-redis/v9"
)

type Redis struct {
    Client *redis.Client
    Ctx    context.Context
}

func ConnectRedis() (*Redis, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT"),
        Password: os.Getenv("REDIS_PASSWORD"),
        DB:       0,
    })

    ctx := context.Background()
    if err := client.Ping(ctx).Err(); err != nil {
        return nil, err
    }

    return &Redis{Client: client, Ctx: ctx}, nil
}