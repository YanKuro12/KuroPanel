package nodes

import (
    "time"
    "encoding/json"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/kuropanel/backend/internal/database"
    "github.com/kuropanel/backend/internal/middleware"
)

type Node struct {
    ID            string    `json:"id"`
    Name          string    `json:"name"`
    Hostname      string    `json:"hostname"`
    IP            string    `json:"ip"`
    Token         string    `json:"token"`
    Status        string    `json:"status"`
    CPU           float64   `json:"cpu"`
    Memory        float64   `json:"memory"`
    Disk          float64   `json:"disk"`
    Uptime        float64   `json:"uptime"`
    LastHeartbeat time.Time `json:"last_heartbeat"`
    UserID        string    `json:"user_id"`
    CreatedAt     time.Time `json:"created_at"`
}

func SetupRoutes(app fiber.Router, db *database.DB, redis *database.Redis) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    app.Get("/nodes", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        rows, err := db.Conn.Query(
            "SELECT id, name, hostname, ip, token, status, cpu, memory, disk, uptime, last_heartbeat, created_at FROM nodes WHERE user_id = $1 ORDER BY created_at DESC",
            userID,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch nodes"})
        }
        defer rows.Close()

        var nodes []Node
        for rows.Next() {
            var n Node
            rows.Scan(&n.ID, &n.Name, &n.Hostname, &n.IP, &n.Token, &n.Status, &n.CPU, &n.Memory, &n.Disk, &n.Uptime, &n.LastHeartbeat, &n.CreatedAt)
            nodes = append(nodes, n)
        }

        return c.JSON(nodes)
    })

    app.Post("/nodes", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        var body struct {
            Name     string `json:"name"`
            Hostname string `json:"hostname"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        id := uuid.New().String()
        token := uuid.New().String()
        _, err := db.Conn.Exec(
            "INSERT INTO nodes (id, name, hostname, token, status, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            id, body.Name, body.Hostname, token, "offline", userID, time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create node"})
        }

        return c.JSON(fiber.Map{"id": id, "name": body.Name, "hostname": body.Hostname, "token": token})
    })

    app.Delete("/nodes/:id", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        _, err := db.Conn.Exec("DELETE FROM nodes WHERE id = $1 AND user_id = $2", id, userID)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to delete node"})
        }

        redis.Client.Del(redis.Ctx, "node:"+id)
        return c.JSON(fiber.Map{"success": true})
    })

    app.Get("/nodes/:id/stats", func(c *fiber.Ctx) error {
        id := c.Params("id")

        val, err := redis.Client.HGetAll(redis.Ctx, "node:"+id).Result()
        if err == nil && len(val) > 0 {
            return c.JSON(fiber.Map{
                "cpu":      val["cpu"],
                "memory":   val["memory"],
                "disk":     val["disk"],
                "uptime":   val["uptime"],
                "status":   val["status"],
            })
        }

        var node Node
        err = db.Conn.QueryRow(
            "SELECT cpu, memory, disk, uptime, status FROM nodes WHERE id = $1",
            id,
        ).Scan(&node.CPU, &node.Memory, &node.Disk, &node.Uptime, &node.Status)

        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        return c.JSON(fiber.Map{
            "cpu":    node.CPU,
            "memory": node.Memory,
            "disk":   node.Disk,
            "uptime": node.Uptime,
            "status": node.Status,
        })
    })
}