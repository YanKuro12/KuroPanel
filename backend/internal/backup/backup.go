package backup

import (
    "database/sql"
    "fmt"
    "os"
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/yankuro12/kuropanel/backend/internal/database"
    "github.com/yankuro12/kuropanel/backend/internal/middleware"
)

func SetupRoutes(app fiber.Router, db *database.DB) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    app.Get("/backup", func(c *fiber.Ctx) error {
        backups, err := os.ReadDir("/opt/backups")
        if err != nil {
            return c.JSON([]interface{}{})
        }

        var result []map[string]interface{}
        for _, entry := range backups {
            info, _ := entry.Info()
            result = append(result, map[string]interface{}{
                "id": uuid.New().String(),
                "filename": entry.Name(),
                "size": info.Size(),
                "status": "completed",
                "type": "full",
                "created_at": info.ModTime(),
            })
        }
        return c.JSON(result)
    })

    app.Post("/backup/create", func(c *fiber.Ctx) error {
        filename := fmt.Sprintf("backup_%s.sql.gz", time.Now().Format("20060102_150405"))
        cmd := exec.Command("pg_dump", "-U", "kuropanel", "-h", "postgres", "-Fc", "kuropanel", "-f", "/tmp/"+filename)
        if err := cmd.Run(); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Backup failed"})
        }

        os.Rename("/tmp/"+filename, "/opt/backups/"+filename)
        return c.JSON(fiber.Map{"success": true, "filename": filename})
    })

    app.Get("/backup/:id/download", func(c *fiber.Ctx) error {
        id := c.Params("id")
        files, _ := os.ReadDir("/opt/backups")
        for _, f := range files {
            if f.Name() == id || f.Name() == id+".sql.gz" {
                return c.Download("/opt/backups/"+f.Name())
            }
        }
        return c.Status(404).JSON(fiber.Map{"error": "Backup not found"})
    })

    app.Delete("/backup/:id", func(c *fiber.Ctx) error {
        id := c.Params("id")
        files, _ := os.ReadDir("/opt/backups")
        for _, f := range files {
            if f.Name() == id || f.Name() == id+".sql.gz" {
                os.Remove("/opt/backups/" + f.Name())
                return c.JSON(fiber.Map{"success": true})
            }
        }
        return c.Status(404).JSON(fiber.Map{"error": "Backup not found"})
    })

    app.Post("/backup/:id/restore", func(c *fiber.Ctx) error {
        id := c.Params("id")
        files, _ := os.ReadDir("/opt/backups")
        for _, f := range files {
            if f.Name() == id || f.Name() == id+".sql.gz" {
                cmd := exec.Command("pg_restore", "-U", "kuropanel", "-h", "postgres", "-d", "kuropanel", "-c", "/opt/backups/"+f.Name())
                if err := cmd.Run(); err != nil {
                    return c.Status(500).JSON(fiber.Map{"error": "Restore failed"})
                }
                return c.JSON(fiber.Map{"success": true})
            }
        }
        return c.Status(404).JSON(fiber.Map{"error": "Backup not found"})
    })
}