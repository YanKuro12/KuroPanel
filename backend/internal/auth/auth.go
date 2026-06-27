package auth

import (
    "time"
    "os"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "golang.org/x/crypto/bcrypt"
    "github.com/yankuro12/kuropanel/backend/internal/database"
)

type User struct {
    ID        string
    Email     string
    Password  string
    Name      string
    Role      string
    CreatedAt time.Time
}

func SetupRoutes(app fiber.Router, db *database.DB) {
    app.Post("/auth/register", func(c *fiber.Ctx) error {
        var body struct {
            Email    string `json:"email"`
            Password string `json:"password"`
            Name     string `json:"name"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var count int
        db.Conn.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", body.Email).Scan(&count)
        if count > 0 {
            return c.Status(400).JSON(fiber.Map{"error": "Email already exists"})
        }

        hashed, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Internal error"})
        }

        id := uuid.New().String()
        _, err = db.Conn.Exec(
            "INSERT INTO users (id, email, password, name, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            id, body.Email, string(hashed), body.Name, "user", time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
        }

        token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
            "id":    id,
            "email": body.Email,
            "exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
        })

        tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
        }

        return c.JSON(fiber.Map{
            "token": tokenString,
            "user": fiber.Map{
                "id":    id,
                "email": body.Email,
                "name":  body.Name,
                "role":  "user",
            },
        })
    })

    app.Post("/auth/login", func(c *fiber.Ctx) error {
        var body struct {
            Email    string `json:"email"`
            Password string `json:"password"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var user User
        err := db.Conn.QueryRow(
            "SELECT id, email, password, name, role, created_at FROM users WHERE email = $1",
            body.Email,
        ).Scan(&user.ID, &user.Email, &user.Password, &user.Name, &user.Role, &user.CreatedAt)

        if err != nil {
            return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
        }

        if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.Password)); err != nil {
            return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
        }

        token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
            "id":    user.ID,
            "email": user.Email,
            "exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
        })

        tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
        }

        return c.JSON(fiber.Map{
            "token": tokenString,
            "user": fiber.Map{
                "id":    user.ID,
                "email": user.Email,
                "name":  user.Name,
                "role":  user.Role,
            },
        })
    })
}