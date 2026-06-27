package middleware

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
)

func RateLimit() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        100,
        Expiration: 60 * time.Second,
        KeyGenerator: func(c *fiber.Ctx) string {
            token := c.Get("Authorization")
            if token != "" {
                return token
            }
            return c.IP()
        },
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(429).JSON(fiber.Map{"error": "Rate limit exceeded"})
        },
    })
}