package files

import (
    "encoding/json"
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
    "github.com/kuropanel/backend/internal/database"
    "github.com/yankuro12/kuropanel/backend/internal/middleware"
    "github.com/yankuro12/kuropanel/backend/internal/websocket"
)

type FileNode struct {
    ID        string    `json:"id"`
    Path      string    `json:"path"`
    Name      string    `json:"name"`
    IsDir     bool      `json:"is_dir"`
    Size      int64     `json:"size"`
    MimeType  string    `json:"mime_type"`
    Perm      string    `json:"perm"`
    NodeID    string    `json:"node_id"`
    UserID    string    `json:"user_id"`
    ParentID  string    `json:"parent_id"`
    CreatedAt time.Time `json:"created_at"`
}

func SetupRoutes(app fiber.Router, db *database.DB, redis *database.Redis) {
    app.Use(middleware.Auth())
    app.Use(middleware.RateLimit())

    app.Get("/files/list/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        dirPath := c.Query("path", "/")

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        rows, err := db.Conn.Query(
            `SELECT id, path, name, is_dir, size, mime_type, perm, created_at 
             FROM file_nodes WHERE node_id = $1 AND parent_id = $2 ORDER BY is_dir DESC, name ASC`,
            nodeID, dirPath,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to list files"})
        }
        defer rows.Close()

        var files []FileNode
        for rows.Next() {
            var f FileNode
            rows.Scan(&f.ID, &f.Path, &f.Name, &f.IsDir, &f.Size, &f.MimeType, &f.Perm, &f.CreatedAt)
            files = append(files, f)
        }

        return c.JSON(fiber.Map{"files": files, "currentPath": dirPath})
    })

    app.Get("/files/content/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        filePath := c.Query("path")

        if filePath == "" {
            return c.Status(400).JSON(fiber.Map{"error": "Path required"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        var file FileNode
        err := db.Conn.QueryRow(
            `SELECT id, path, name, is_dir, size, mime_type, perm, created_at 
             FROM file_nodes WHERE node_id = $1 AND path = $2`,
            nodeID, filePath,
        ).Scan(&file.ID, &file.Path, &file.Name, &file.IsDir, &file.Size, &file.MimeType, &file.Perm, &file.CreatedAt)

        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "File not found"})
        }

        if file.IsDir {
            return c.Status(400).JSON(fiber.Map{"error": "Cannot read directory"})
        }

        requestID := uuid.New().String()
        conn := websocket.GetConnections()[nodeID]
        if conn == nil {
            return c.Status(400).JSON(fiber.Map{"error": "Node offline"})
        }

        msg, _ := json.Marshal(map[string]interface{}{
            "type":       "file_read",
            "request_id": requestID,
            "path":       filePath,
        })
        conn.WriteMessage(1, msg)

        time.Sleep(2 * time.Second)

        return c.JSON(fiber.Map{"content": "", "file": file})
    })

    app.Post("/files/save/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            Path    string `json:"path"`
            Content string `json:"content"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn == nil {
            return c.Status(400).JSON(fiber.Map{"error": "Node offline"})
        }

        requestID := uuid.New().String()
        msg, _ := json.Marshal(map[string]interface{}{
            "type":       "file_save",
            "request_id": requestID,
            "path":       body.Path,
            "content":    body.Content,
        })
        conn.WriteMessage(1, msg)

        return c.JSON(fiber.Map{"success": true, "message": "File saved"})
    })

    app.Post("/files/create/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            Path  string `json:"path"`
            Name  string `json:"name"`
            IsDir bool   `json:"is_dir"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        if body.Name == "" {
            return c.Status(400).JSON(fiber.Map{"error": "Name required"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        fullPath := body.Path
        if fullPath == "/" {
            fullPath = "/" + body.Name
        } else {
            fullPath = body.Path + "/" + body.Name
        }

        id := uuid.New().String()
        _, err := db.Conn.Exec(
            `INSERT INTO file_nodes (id, path, name, is_dir, node_id, user_id, parent_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            id, fullPath, body.Name, body.IsDir, nodeID, c.Locals("userID"), body.Path, time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create file"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_create",
                "request_id": requestID,
                "path":       fullPath,
                "is_dir":     body.IsDir,
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Created", "id": id})
    })

    app.Delete("/files/delete/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        filePath := c.Query("path")

        if filePath == "" {
            return c.Status(400).JSON(fiber.Map{"error": "Path required"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        _, err := db.Conn.Exec(
            "DELETE FROM file_nodes WHERE node_id = $1 AND path = $2",
            nodeID, filePath,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to delete file"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_delete",
                "request_id": requestID,
                "path":       filePath,
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Deleted"})
    })

    app.Put("/files/rename/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            OldPath string `json:"oldPath"`
            NewName string `json:"newName"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        dir := filepath.Dir(body.OldPath)
        newPath := dir + "/" + body.NewName

        _, err := db.Conn.Exec(
            "UPDATE file_nodes SET path = $1, name = $2 WHERE node_id = $3 AND path = $4",
            newPath, body.NewName, nodeID, body.OldPath,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to rename"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_rename",
                "request_id": requestID,
                "old_path":   body.OldPath,
                "new_path":   newPath,
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Renamed"})
    })

    app.Post("/files/upload/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        targetPath := c.Query("path", "/")

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        file, err := c.FormFile("file")
        if err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "File required"})
        }

        fullPath := targetPath + "/" + file.Filename

        id := uuid.New().String()
        _, err = db.Conn.Exec(
            `INSERT INTO file_nodes (id, path, name, is_dir, size, node_id, user_id, parent_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            id, fullPath, file.Filename, false, file.Size, nodeID, c.Locals("userID"), targetPath, time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to upload"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            src, err := file.Open()
            if err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
            }
            defer src.Close()

            content, err := io.ReadAll(src)
            if err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to read file"})
            }

            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_upload",
                "request_id": requestID,
                "path":       fullPath,
                "content":    base64.StdEncoding.EncodeToString(content),
                "encoding":   "base64",
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Uploaded"})
    })

    app.Get("/files/download/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        filePath := c.Query("path")

        if filePath == "" {
            return c.Status(400).JSON(fiber.Map{"error": "Path required"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        var file FileNode
        err := db.Conn.QueryRow(
            `SELECT name, size FROM file_nodes WHERE node_id = $1 AND path = $2`,
            nodeID, filePath,
        ).Scan(&file.Name, &file.Size)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "File not found"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn == nil {
            return c.Status(400).JSON(fiber.Map{"error": "Node offline"})
        }

        requestID := uuid.New().String()
        msg, _ := json.Marshal(map[string]interface{}{
            "type":       "file_download",
            "request_id": requestID,
            "path":       filePath,
        })
        conn.WriteMessage(1, msg)

        time.Sleep(2 * time.Second)

        return c.Download("/tmp/"+file.Name, file.Name)
    })

    app.Post("/files/chmod/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            Path string `json:"path"`
            Perm string `json:"perm"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        _, err := db.Conn.Exec(
            "UPDATE file_nodes SET perm = $1 WHERE node_id = $2 AND path = $3",
            body.Perm, nodeID, body.Path,
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to chmod"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_chmod",
                "request_id": requestID,
                "path":       body.Path,
                "perm":       body.Perm,
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Permission updated"})
    })

    app.Post("/files/zip/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            Path string `json:"path"`
            Name string `json:"name"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        zipPath := body.Path + "/" + body.Name + ".zip"

        id := uuid.New().String()
        _, err := db.Conn.Exec(
            `INSERT INTO file_nodes (id, path, name, is_dir, node_id, user_id, parent_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            id, zipPath, body.Name+".zip", false, nodeID, c.Locals("userID"), body.Path, time.Now(),
        )
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to zip"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_zip",
                "request_id": requestID,
                "source":     body.Path,
                "destination": zipPath,
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Zipped", "path": zipPath})
    })

    app.Post("/files/unzip/:nodeId", func(c *fiber.Ctx) error {
        nodeID := c.Params("nodeId")
        var body struct {
            Path string `json:"path"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        var exists int
        db.Conn.QueryRow("SELECT 1 FROM nodes WHERE id = $1 AND user_id = $2", nodeID, c.Locals("userID")).Scan(&exists)
        if exists == 0 {
            return c.Status(404).JSON(fiber.Map{"error": "Node not found"})
        }

        conn := websocket.GetConnections()[nodeID]
        if conn != nil {
            requestID := uuid.New().String()
            msg, _ := json.Marshal(map[string]interface{}{
                "type":       "file_unzip",
                "request_id": requestID,
                "path":       body.Path,
                "destination": filepath.Dir(body.Path),
            })
            conn.WriteMessage(1, msg)
        }

        return c.JSON(fiber.Map{"success": true, "message": "Unzipped"})
    })
}