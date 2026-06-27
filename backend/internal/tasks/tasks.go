package tasks

import (
    "time"
    "encoding/json"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/kuropanel/backend/internal/database"
    "github.com/kuropanel/backend/internal/middleware"
)

type Task struct {
    ID        string    `json:"id"`
    NodeID    string    `json:"node_id"`
    Type      string    `json:"type"`
    Target    string    `json:"target"`
    Params    string    `json:"params"`
    Status    string    `json:"status"`
    Result    string    `json:"result"`
    UserID    string    `json:"user_id"`
    CreatedAt time.Time `json:"created_at"`
}

func SetupRoutes(app fiber.Router, db *database.DB, redis *database.Redis) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    app.Get("/tasks/node/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        rows, err := db.Conn.Query(
            "SELECT id, type, target, params, status, result, created_at FROM tasks WHERE node_id = $1 ORDER BY created_at DESC LIMIT 50",
            nodeID,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch tasks"})
        }
        defer rows.Close()

        var tasks []Task
        for rows.Next() {
            var t Task
            rows.Scan(&t.ID, &t.Type, &t.Target, &t.Params, &t.Status, &t.Result, &t.CreatedAt)
            tasks = append(tasks, t)
        }

        return c.JSON(tasks)
    })

    app.Post("/tasks/node/:nodeId", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        nodeID := c.Params("nodeId")

        var body struct {
            Type   string                 `json:"type"`
            Target string                 `json:"target"`
            Params map[string]interface{} `json:"params"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        paramsJSON, _ := json.Marshal(body.Params)
        id := uuid.New().String()

        _, err := db.Conn.Exec(
            "INSERT INTO tasks (id, node_id, type, target, params, status, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            id, nodeID, body.Type, body.Target, string(paramsJSON), "pending", userID, time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create task"})
        }

        // Add to queue
        redis.Client.RPush(redis.Ctx, "queue:"+nodeID, id)

        return c.JSON(fiber.Map{"id": id, "status": "pending"})
    })

    app.Get("/tasks/:id", func(c *fiber.Ctx) error {
        id := c.Params("id")
        var task Task
        err := db.Conn.QueryRow(
            "SELECT id, node_id, type, target, params, status, result, created_at FROM tasks WHERE id = $1",
            id,
        ).Scan(&task.ID, &task.NodeID, &task.Type, &task.Target, &task.Params, &task.Status, &task.Result, &task.CreatedAt)

        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Task not found"})
        }

        return c.JSON(task)
    })

    app.Delete("/tasks/:id", func(c *fiber.Ctx) error {
        id := c.Params("id")
        _, err := db.Conn.Exec("DELETE FROM tasks WHERE id = $1", id)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to delete task"})
        }
        return c.JSON(fiber.Map{"success": true})
    })
}