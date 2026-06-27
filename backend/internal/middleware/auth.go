package middleware

import (
    "os"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
)

func Auth() fiber.Handler {
    return func(c *fiber.Ctx) error {
        token := c.Get("Authorization")
        if token == "" {
            return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
        }

        token = token[len("Bearer "):]
        claims := jwt.MapClaims{}
        _, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
            return []byte(os.Getenv("JWT_SECRET")), nil
        })

        if err != nil {
            return c.Status(401).JSON(fiber.Map{"error": "Invalid token"})
        }

        c.Locals("userID", claims["id"])
        c.Locals("userEmail", claims["email"])
        return c.Next()
    }
}