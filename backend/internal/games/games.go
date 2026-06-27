package games

import (
    "database/sql"
    "encoding/json"
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/yankuro12/kuropanel/backend/internal/database"
    "github.com/yamkuro12/kuropanel/backend/internal/middleware"
)

type Game struct {
    ID             string    `json:"id"`
    Name           string    `json:"name"`
    Type           string    `json:"type"`
    Version        string    `json:"version"`
    NodeID         string    `json:"node_id"`
    Port           int       `json:"port"`
    CPU            int       `json:"cpu"`
    Memory         int       `json:"memory"`
    Storage        int       `json:"storage"`
    Status         string    `json:"status"`
    Players        int       `json:"players"`
    MaxPlayers     int       `json:"max_players"`
    WorldName      string    `json:"world_name"`
    BackupEnabled  bool      `json:"backup_enabled"`
    BackupInterval int       `json:"backup_interval"`
    UserID         string    `json:"user_id"`
    CreatedAt      time.Time `json:"created_at"`
    UpdatedAt      time.Time `json:"updated_at"`
}

type GameBackup struct {
    ID        string    `json:"id"`
    GameID    string    `json:"game_id"`
    Path      string    `json:"path"`
    Size      int       `json:"size"`
    CreatedAt time.Time `json:"created_at"`
}

type GameImage struct {
    Type    string `json:"type"`
    Image   string `json:"image"`
    DefaultPort int `json:"default_port"`
    MinMemory int `json:"min_memory"`
    MaxMemory int `json:"max_memory"`
}

var gameImages = []GameImage{
    {Type: "minecraft", Image: "itzg/minecraft-server", DefaultPort: 25565, MinMemory: 1024, MaxMemory: 8192},
    {Type: "rust", Image: "didstopia/rust-server", DefaultPort: 28015, MinMemory: 2048, MaxMemory: 8192},
    {Type: "csgo", Image: "cm2network/csgo", DefaultPort: 27015, MinMemory: 1024, MaxMemory: 4096},
    {Type: "valheim", Image: "mbround18/valheim", DefaultPort: 2456, MinMemory: 2048, MaxMemory: 8192},
    {Type: "palworld", Image: "jammsen/palworld", DefaultPort: 8211, MinMemory: 4096, MaxMemory: 16384},
    {Type: "terraria", Image: "tiniq/terraria", DefaultPort: 7777, MinMemory: 512, MaxMemory: 2048},
    {Type: "gmod", Image: "cm2network/gmod", DefaultPort: 27015, MinMemory: 1024, MaxMemory: 4096},
    {Type: "ark", Image: "steamcmd/ark", DefaultPort: 7777, MinMemory: 4096, MaxMemory: 16384},
}

func SetupRoutes(app fiber.Router, db *database.DB, redis *database.Redis) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    // Get game types
    app.Get("/games/types", func(c *fiber.Ctx) error {
        return c.JSON(gameImages)
    })

    // List games
    app.Get("/games", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        rows, err := db.Conn.Query(
            `SELECT id, name, type, version, node_id, port, cpu, memory, storage, 
                    status, players, max_players, world_name, backup_enabled, backup_interval, 
                    created_at, updated_at 
             FROM games WHERE user_id = $1 ORDER BY created_at DESC`,
            userID,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch games"})
        }
        defer rows.Close()

        var games []Game
        for rows.Next() {
            var g Game
            rows.Scan(&g.ID, &g.Name, &g.Type, &g.Version, &g.NodeID, &g.Port, &g.CPU, &g.Memory,
                &g.Storage, &g.Status, &g.Players, &g.MaxPlayers, &g.WorldName, &g.BackupEnabled,
                &g.BackupInterval, &g.CreatedAt, &g.UpdatedAt)
            games = append(games, g)
        }
        return c.JSON(games)
    })

    // Get single game
    app.Get("/games/:id", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var g Game
        err := db.Conn.QueryRow(
            `SELECT id, name, type, version, node_id, port, cpu, memory, storage, 
                    status, players, max_players, world_name, backup_enabled, backup_interval, 
                    created_at, updated_at 
             FROM games WHERE id = $1 AND user_id = $2`,
            id, userID,
        ).Scan(&g.ID, &g.Name, &g.Type, &g.Version, &g.NodeID, &g.Port, &g.CPU, &g.Memory,
            &g.Storage, &g.Status, &g.Players, &g.MaxPlayers, &g.WorldName, &g.BackupEnabled,
            &g.BackupInterval, &g.CreatedAt, &g.UpdatedAt)

        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }
        return c.JSON(g)
    })

    // Deploy game
    app.Post("/games/deploy", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        var body struct {
            Name          string `json:"name"`
            Type          string `json:"type"`
            Version       string `json:"version"`
            NodeID        string `json:"node_id"`
            Port          int    `json:"port"`
            CPU           int    `json:"cpu"`
            Memory        int    `json:"memory"`
            MaxPlayers    int    `json:"max_players"`
            WorldName     string `json:"world_name"`
            BackupEnabled bool   `json:"backup_enabled"`
            BackupInterval int   `json:"backup_interval"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        // Validate type
        var img *GameImage
        for _, i := range gameImages {
            if i.Type == body.Type {
                img = &i
                break
            }
        }
        if img == nil {
            return c.Status(400).JSON(fiber.Map{"error": "Unsupported game type"})
        }

        // Validate node exists and belongs to user
        var nodeExists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", body.NodeID, userID).Scan(&nodeExists)
        if nodeExists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        // Validate port not used
        var portUsed int
        db.Conn.QueryRow("SELECT 1 FROM games WHERE node_id = $1 AND port = $2", body.NodeID, body.Port).Scan(&portUsed)
        if portUsed > 0 {
            return c.Status(400).JSON(fiber.Map{"error": "Port already in use"})
        }

        id := uuid.New().String()
        _, err := db.Conn.Exec(
            `INSERT INTO games (id, name, type, version, node_id, port, cpu, memory, max_players, 
                                world_name, backup_enabled, backup_interval, user_id, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)`,
            id, body.Name, body.Type, body.Version, body.NodeID, body.Port, body.CPU, body.Memory,
            body.MaxPlayers, body.WorldName, body.BackupEnabled, body.BackupInterval, userID, "deploying",
            time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to deploy game"})
        }

        // Send to agent via WebSocket
        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_deploy",
                "gameId": id,
                "name": body.Name,
                "type": body.Type,
                "image": img.Image,
                "version": body.Version,
                "port": body.Port,
                "cpu": body.CPU,
                "memory": body.Memory,
                "maxPlayers": body.MaxPlayers,
                "worldName": body.WorldName,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"id": id, "status": "deploying"})
    })

    // Start game
    app.Post("/games/:id/start", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var nodeID, status string
        err := db.Conn.QueryRow("SELECT node_id, status FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID, &status)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        if status == "running" {
            return c.Status(400).JSON(fiber.Map{"error": "Game already running"})
        }

        _, err = db.Conn.Exec("UPDATE games SET status = 'starting', updated_at = $1 WHERE id = $2", time.Now(), id)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to start game"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_start",
                "gameId": id,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "status": "starting"})
    })

    // Stop game
    app.Post("/games/:id/stop", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var nodeID, status string
        err := db.Conn.QueryRow("SELECT node_id, status FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID, &status)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        if status != "running" && status != "starting" {
            return c.Status(400).JSON(fiber.Map{"error": "Game not running"})
        }

        _, err = db.Conn.Exec("UPDATE games SET status = 'stopping', updated_at = $1 WHERE id = $2", time.Now(), id)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to stop game"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_stop",
                "gameId": id,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "status": "stopping"})
    })

    // Restart game
    app.Post("/games/:id/restart", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var nodeID string
        err := db.Conn.QueryRow("SELECT node_id FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        _, err = db.Conn.Exec("UPDATE games SET status = 'restarting', updated_at = $1 WHERE id = $2", time.Now(), id)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to restart game"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_restart",
                "gameId": id,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "status": "restarting"})
    })

    // Delete game
    app.Delete("/games/:id", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var nodeID string
        err := db.Conn.QueryRow("SELECT node_id FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        _, err = db.Conn.Exec("DELETE FROM games WHERE id = $1 AND user_id = $2", id, userID)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to delete game"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_delete",
                "gameId": id,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true})
    })

    // Get game logs
    app.Get("/games/:id/logs", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")
        limit := c.QueryInt("limit", 100)

        var nodeID string
        err := db.Conn.QueryRow("SELECT node_id FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        // Get logs from Redis
        logs, _ := redis.Client.LRange(redis.Ctx, "game_logs:"+id, 0, int64(limit-1)).Result()

        return c.JSON(fiber.Map{"logs": logs})
    })

    // Get game status (with cache)
    app.Get("/games/:id/status", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        // Try Redis cache first
        cached, _ := redis.Client.HGetAll(redis.Ctx, "game_status:"+id).Result()
        if len(cached) > 0 {
            return c.JSON(fiber.Map{
                "status": cached["status"],
                "players": cached["players"],
                "uptime": cached["uptime"],
            })
        }

        var status string
        var players int
        err := db.Conn.QueryRow("SELECT status, players FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&status, &players)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        return c.JSON(fiber.Map{
            "status": status,
            "players": players,
        })
    })

    // Backup game
    app.Post("/games/:id/backup", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var nodeID, name string
        err := db.Conn.QueryRow("SELECT node_id, name FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&nodeID, &name)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        backupID := uuid.New().String()
        _, err = db.Conn.Exec(
            "INSERT INTO game_backups (id, game_id, path, created_at) VALUES ($1, $2, $3, $4)",
            backupID, id, "/backups/"+name+"_"+time.Now().Format("20060102_150405"), time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create backup"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_backup",
                "gameId": id,
                "backupId": backupID,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "backup_id": backupID})
    })

    // List backups
    app.Get("/games/:id/backups", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM games WHERE id = $1 AND user_id = $2", id, userID).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Game not found"})
        }

        rows, err := db.Conn.Query(
            "SELECT id, path, size, created_at FROM game_backups WHERE game_id = $1 ORDER BY created_at DESC",
            id,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch backups"})
        }
        defer rows.Close()

        var backups []GameBackup
        for rows.Next() {
            var b GameBackup
            rows.Scan(&b.ID, &b.Path, &b.Size, &b.CreatedAt)
            backups = append(backups, b)
        }
        return c.JSON(backups)
    })

    // Restore backup
    app.Post("/games/:id/restore/:backupId", func(c *fiber.Ctx) error {
        userID := c.Locals("userID").(string)
        id := c.Params("id")
        backupID := c.Params("backupId")

        var nodeID, backupPath string
        err := db.Conn.QueryRow(
            "SELECT g.node_id, b.path FROM games g JOIN game_backups b ON g.id = b.game_id WHERE g.id = $1 AND g.user_id = $2 AND b.id = $3",
            id, userID, backupID,
        ).Scan(&nodeID, &backupPath)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Backup not found"})
        }

        socket := connections[nodeID]
        if socket != nil {
            msg, _ := json.Marshal(map[string]interface{}{
                "type": "game_restore",
                "gameId": id,
                "backupPath": backupPath,
            })
            socket.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true})
    })
}