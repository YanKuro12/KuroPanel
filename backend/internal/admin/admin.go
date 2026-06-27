package admin

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/kuropanel/backend/internal/database"
    "github.com/kuropanel/backend/internal/middleware"
    "golang.org/x/crypto/bcrypt"
)

func SetupRoutes(app fiber.Router, db *database.DB) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    app.Get("/admin/users", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)

        var isAdmin bool
        db.Conn.QueryRow("SELECT role = 'admin' FROM users WHERE id = $1", userID).Scan(&isAdmin)
        if !isAdmin {
            return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
        }

        rows, err := db.Conn.Query(
            "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC",
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch users"})
        }
        defer rows.Close()

        var users []map[string]interface{}
        for rows.Next() {
            var id, email, name, role string
            var created_at time.Time
            rows.Scan(&id, &email, &name, &role, &created_at)
            users = append(users, map[string]interface{}{
                "id": id,
                "email": email,
                "name": name,
                "role": role,
                "created_at": created_at,
            })
        }
        return c.JSON(users)
    })

    app.Put("/admin/users/:id", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var isAdmin bool
        db.Conn.QueryRow("SELECT role = 'admin' FROM users WHERE id = $1", userID).Scan(&isAdmin)
        if !isAdmin {
            return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
        }

        var body struct {
            Name string `json:"name"`
            Role string `json:"role"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        _, err := db.Conn.Exec(
            "UPDATE users SET name = $1, role = $2 WHERE id = $3",
            body.Name, body.Role, id,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to update user"})
        }

        return c.JSON(fiber.Map{"success": true})
    })

    app.Delete("/admin/users/:id", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var isAdmin bool
        db.Conn.QueryRow("SELECT role = 'admin' FROM users WHERE id = $1", userID).Scan(&isAdmin)
        if !isAdmin {
            return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
        }

        if id == userID {
            return c.Status(400).JSON(fiber.Map{"error": "Cannot delete yourself"})
        }

        _, err := db.Conn.Exec("DELETE FROM users WHERE id = $1", id)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to delete user"})
        }

        return c.JSON(fiber.Map{"success": true})
    })

    app.Patch("/admin/users/:id/role", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var isAdmin bool
        db.Conn.QueryRow("SELECT role = 'admin' FROM users WHERE id = $1", userID).Scan(&isAdmin)
        if !isAdmin {
            return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
        }

        var body struct {
            Role string `json:"role"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        if body.Role != "admin" && body.Role != "user" {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid role"})
        }

        _, err := db.Conn.Exec(
            "UPDATE users SET role = $1 WHERE id = $2",
            body.Role, id,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to update role"})
        }

        return c.JSON(fiber.Map{"success": true})
    })
}