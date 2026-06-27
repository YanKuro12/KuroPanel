package websocket

import (
    "encoding/json"
    "log"
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/websocket/v2"
    "github.com/kuropanel/backend/internal/database"
    "github.com/kuropanel/backend/internal/games"
)

var connections = make(map[string]*websocket.Conn)

type Message struct {
    Type       string          `json:"type"`
    RequestID  string          `json:"request_id,omitempty"`
    TaskID     string          `json:"task_id,omitempty"`
    GameID     string          `json:"game_id,omitempty"`
    BackupID   string          `json:"backup_id,omitempty"`
    BackupPath string          `json:"backup_path,omitempty"`
    Path       string          `json:"path,omitempty"`
    Content    string          `json:"content,omitempty"`
    Params     json.RawMessage `json:"params,omitempty"`
    Result     string          `json:"result,omitempty"`
    Error      string          `json:"error,omitempty"`
    CPU        float64         `json:"cpu,omitempty"`
    Memory     float64         `json:"memory,omitempty"`
    Disk       float64         `json:"disk,omitempty"`
    Uptime     float64         `json:"uptime,omitempty"`
    Status     string          `json:"status,omitempty"`
    Players    int             `json:"players,omitempty"`
    Log        string          `json:"log,omitempty"`
}

func SetupRoutes(app *fiber.App, db *database.DB, redis *database.Redis) {
    app.Get("/ws", websocket.New(func(c *websocket.Conn) {
        token := c.Query("token")
        if token == "" {
            c.Close()
            return
        }

        var nodeID string
        err := db.Conn.QueryRow("SELECT id FROM nodes WHERE token = $1", token).Scan(&nodeID)
        if err != nil {
            c.Close()
            return
        }

        connections[nodeID] = c
        defer delete(connections, nodeID)

        _, err = db.Conn.Exec(
            "UPDATE nodes SET status = 'online', last_heartbeat = $1 WHERE id = $2",
            time.Now(), nodeID,
        )
        if err != nil {
            log.Printf("Failed to update node status: %v", err)
        }

        go sendPendingTasks(nodeID, c, db, redis)

        for {
            _, msgBytes, err := c.ReadMessage()
            if err != nil {
                break
            }

            var msg Message
            if err := json.Unmarshal(msgBytes, &msg); err != nil {
                continue
            }

            switch msg.Type {
            case "heartbeat":
                _, err := db.Conn.Exec(
                    "UPDATE nodes SET cpu = $1, memory = $2, disk = $3, uptime = $4, last_heartbeat = $5 WHERE id = $6",
                    msg.CPU, msg.Memory, msg.Disk, msg.Uptime, time.Now(), nodeID,
                )
                if err != nil {
                    log.Printf("Failed to update heartbeat: %v", err)
                }

                redis.Client.HSet(redis.Ctx, "node:"+nodeID, "cpu", msg.CPU, "memory", msg.Memory, "disk", msg.Disk, "uptime", msg.Uptime, "status", "online", "last_heartbeat", time.Now().Unix())
                redis.Client.Expire(redis.Ctx, "node:"+nodeID, 60*time.Second)

            case "result":
                _, err := db.Conn.Exec(
                    "UPDATE tasks SET status = 'done', result = $1 WHERE id = $2",
                    msg.Result, msg.TaskID,
                )
                if err != nil {
                    log.Printf("Failed to update task result: %v", err)
                }

                redis.Client.LRem(redis.Ctx, "queue:"+nodeID, 0, msg.TaskID)

            case "game_deploy":
                _, err := db.Conn.Exec(
                    "UPDATE games SET status = 'running', updated_at = $1 WHERE id = $2",
                    time.Now(), msg.GameID,
                )
                if err != nil {
                    log.Printf("Failed to update game deploy: %v", err)
                }

                redis.Client.HSet(redis.Ctx, "game_status:"+msg.GameID, "status", "running", "players", 0, "uptime", "0s")
                redis.Client.Expire(redis.Ctx, "game_status:"+msg.GameID, 60*time.Second)

            case "game_started":
                _, err := db.Conn.Exec(
                    "UPDATE games SET status = 'running', updated_at = $1 WHERE id = $2",
                    time.Now(), msg.GameID,
                )
                if err != nil {
                    log.Printf("Failed to update game start: %v", err)
                }

                redis.Client.HSet(redis.Ctx, "game_status:"+msg.GameID, "status", "running")
                redis.Client.Expire(redis.Ctx, "game_status:"+msg.GameID, 60*time.Second)

            case "game_stopped":
                _, err := db.Conn.Exec(
                    "UPDATE games SET status = 'stopped', updated_at = $1 WHERE id = $2",
                    time.Now(), msg.GameID,
                )
                if err != nil {
                    log.Printf("Failed to update game stop: %v", err)
                }

                redis.Client.Del(redis.Ctx, "game_status:"+msg.GameID)

            case "game_status":
                redis.Client.HSet(redis.Ctx, "game_status:"+msg.GameID,
                    "status", msg.Status,
                    "players", msg.Players,
                    "uptime", msg.Uptime,
                )
                redis.Client.Expire(redis.Ctx, "game_status:"+msg.GameID, 60*time.Second)

            case "game_log":
                redis.Client.RPush(redis.Ctx, "game_logs:"+msg.GameID, msg.Log)
                redis.Client.LTrim(redis.Ctx, "game_logs:"+msg.GameID, 0, 999)
            }
        }

        _, err = db.Conn.Exec("UPDATE nodes SET status = 'offline' WHERE id = $1", nodeID)
        if err != nil {
            log.Printf("Failed to update node status: %v", err)
        }
    }))
}

func sendPendingTasks(nodeID string, c *websocket.Conn, db *database.DB, redis *database.Redis) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        queueKey := "queue:" + nodeID
        taskIDs, err := redis.Client.LRange(redis.Ctx, queueKey, 0, -1).Result()
        if err != nil {
            continue
        }

        if len(taskIDs) == 0 {
            rows, err := db.Conn.Query(
                "SELECT id, type, params FROM tasks WHERE node_id = $1 AND status = 'pending' LIMIT 10",
                nodeID,
            )
            if err != nil {
                continue
            }

            for rows.Next() {
                var id, taskType, params string
                rows.Scan(&id, &taskType, &params)
                redis.Client.RPush(redis.Ctx, queueKey, id)
            }
            rows.Close()
            redis.Client.Expire(redis.Ctx, queueKey, 3600*time.Second)
        }

        finalTaskIDs, _ := redis.Client.LRange(redis.Ctx, queueKey, 0, -1).Result()
        if len(finalTaskIDs) == 0 {
            continue
        }

        placeholders := ""
        args := []interface{}{nodeID}
        for i, id := range finalTaskIDs {
            if i > 0 {
                placeholders += ","
            }
            placeholders += "$" + string(rune(i+2))
            args = append(args, id)
        }

        rows, err := db.Conn.Query(
            "SELECT id, type, params FROM tasks WHERE node_id = $1 AND id IN ("+placeholders+") AND status = 'pending'",
            args...,
        )
        if err != nil {
            continue
        }

        var tasks []map[string]interface{}
        for rows.Next() {
            var id, taskType, params string
            rows.Scan(&id, &taskType, &params)
            var paramsMap map[string]interface{}
            json.Unmarshal([]byte(params), &paramsMap)
            tasks = append(tasks, map[string]interface{}{
                "id":     id,
                "type":   taskType,
                "params": paramsMap,
            })
        }
        rows.Close()

        if len(tasks) > 0 {
            msg, _ := json.Marshal(map[string]interface{}{
                "type":  "tasks",
                "tasks": tasks,
            })
            c.WriteMessage(websocket.TextMessage, msg)
        }
    }
}

func GetConnections() map[string]*websocket.Conn {
    return connections
}