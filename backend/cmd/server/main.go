package main

import (
    "log"
    "os"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/rate"
    "github.com/gofiber/websocket/v2"
    "github.com/kuropanel/kuropanel/internal/auth"
    "github.com/kuropanel/kuropanel/internal/nodes"
    "github.com/kuropanel/kuropanel/internal/tasks"
    "github.com/kuropanel/kuropanel/internal/files"
    "github.com/kuropanel/kuropanel/internal/websocket"
    "github.com/kuropanel/kuropanel/internal/database"
)

func main() {
    db, err := database.Connect()
    if err != nil {
        log.Fatal("Database connection failed:", err)
    }

    redis, err := database.ConnectRedis()
    if err != nil {
        log.Fatal("Redis connection failed:", err)
    }

   
    app := fiber.New(fiber.Config{
        Prefork: true,
        ServerHeader: "KuroPanel",
        AppName: "KuroPanel v1.0.0",
    })

    app.Use(logger.New())
    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
        AllowHeaders: "Origin, Content-Type, Accept, Authorization",
    }))
    app.Use(rate.New(rate.Config{
        Max: 100,
        Duration: 60 * time.Second,
        KeyGenerator: func(c *fiber.Ctx) string {
            token := c.Get("Authorization")
            if token != "" {
                // Extract user ID from JWT
                return token
            }
            return c.IP()
        },
    }))

    api := app.Group("/api")
    auth.SetupRoutes(api, db, redis)
    nodes.SetupRoutes(api, db, redis)
    tasks.SetupRoutes(api, db, redis)
    files.SetupRoutes(api, db, redis)
    app.Register(admin.SetupRoutes)

    app.Use("/ws", websocket.New(websocket.Config{
        HandshakeTimeout: 10 * time.Second,
    }))
    websocket.SetupRoutes(app, db, redis)

    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "ok",
            "uptime": time.Now().Unix(),
            "version": "1.0.0",
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "5000"
    }
    log.Fatal(app.Listen(":" + port))
}