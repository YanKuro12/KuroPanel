package websocket

import (
    "encoding/json"
    "fmt"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"
    "github.com/gorilla/websocket"
    "github.com/kuropanel/agent/internal/docker"
    "github.com/kuropanel/agent/internal/executor"
    "github.com/kuropanel/agent/internal/fileops"
    "github.com/kuropanel/agent/internal/monitor"
)

type Client struct {
    conn      *websocket.Conn
    url       string
    token     string
    name      string
    done      chan struct{}
    reconnect bool
}

type Message struct {
    Type      string          `json:"type"`
    RequestID string          `json:"request_id,omitempty"`
    TaskID    string          `json:"task_id,omitempty"`
    GameID    string          `json:"game_id,omitempty"`
    BackupID  string          `json:"backup_id,omitempty"`
    Path      string          `json:"path,omitempty"`
    Content   string          `json:"content,omitempty"`
    Params    json.RawMessage `json:"params,omitempty"`
    Result    string          `json:"result,omitempty"`
    Error     string          `json:"error,omitempty"`
    CPU       float64         `json:"cpu,omitempty"`
    Memory    float64         `json:"memory,omitempty"`
    Disk      float64         `json:"disk,omitempty"`
    Uptime    float64         `json:"uptime,omitempty"`
    Status    string          `json:"status,omitempty"`
    Players   int             `json:"players,omitempty"`
    Log       string          `json:"log,omitempty"`
    Hostname  string          `json:"hostname,omitempty"`
    Platform  string          `json:"platform,omitempty"`
    Arch      string          `json:"arch,omitempty"`
    Cpus      int             `json:"cpus,omitempty"`
    TotalMem  int64           `json:"total_memory,omitempty"`
}

type Task struct {
    ID     string                 `json:"id"`
    Type   string                 `json:"type"`
    Params map[string]interface{} `json:"params"`
}

func NewClient(url, token, name string) *Client {
    return &Client{
        url:       url,
        token:     token,
        name:      name,
        done:      make(chan struct{}),
        reconnect: true,
    }
}

func (c *Client) Connect() error {
    headers := map[string][]string{
        "x-node-token":   {c.token},
        "x-node-name":    {c.name},
        "x-node-version": {"1.0.0"},
    }

    conn, _, err := websocket.DefaultDialer.Dial(c.url, headers)
    if err != nil {
        return fmt.Errorf("failed to connect: %v", err)
    }

    c.conn = conn
    log.Printf("Connected to panel: %s", c.url)

    go c.readMessages()
    go c.heartbeat()
    go c.handleSignals()

    return nil
}

func (c *Client) readMessages() {
    for {
        select {
        case <-c.done:
            return
        default:
            var msg Message
            err := c.conn.ReadJSON(&msg)
            if err != nil {
                log.Printf("Read error: %v", err)
                if c.reconnect {
                    c.reconnectLoop()
                }
                return
            }
            c.handleMessage(msg)
        }
    }
}

func (c *Client) handleMessage(msg Message) {
    switch msg.Type {
    case "register":
        c.sendRegister()

    case "tasks":
        var tasks []Task
        if err := json.Unmarshal(msg.Params, &tasks); err != nil {
            log.Printf("Failed to parse tasks: %v", err)
            return
        }
        for _, task := range tasks {
            go c.executeTask(task)
        }

    case "file_read":
        content, err := fileops.ReadFile(msg.Path)
        resp := Message{
            Type:      "file_content",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        } else {
            resp.Content = content
        }
        c.sendMessage(resp)

    case "file_save":
        err := fileops.WriteFile(msg.Path, msg.Content)
        resp := Message{
            Type:      "file_saved",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_create":
        var isDir bool
        if err := json.Unmarshal(msg.Params, &isDir); err != nil {
            isDir = false
        }
        err := fileops.Create(msg.Path, isDir)
        resp := Message{
            Type:      "file_created",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_delete":
        err := fileops.Delete(msg.Path)
        resp := Message{
            Type:      "file_deleted",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_rename":
        var newPath string
        if err := json.Unmarshal(msg.Params, &newPath); err != nil {
            resp := Message{
                Type:      "file_renamed",
                RequestID: msg.RequestID,
                Error:     "invalid new path",
            }
            c.sendMessage(resp)
            return
        }
        err := fileops.Rename(msg.Path, newPath)
        resp := Message{
            Type:      "file_renamed",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_upload":
        var content string
        if err := json.Unmarshal(msg.Params, &content); err != nil {
            resp := Message{
                Type:      "file_uploaded",
                RequestID: msg.RequestID,
                Error:     "invalid content",
            }
            c.sendMessage(resp)
            return
        }
        err := fileops.Upload(msg.Path, content)
        resp := Message{
            Type:      "file_uploaded",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_download":
        content, err := fileops.Download(msg.Path)
        resp := Message{
            Type:      "file_downloaded",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        } else {
            resp.Content = content
        }
        c.sendMessage(resp)

    case "file_chmod":
        var perm string
        if err := json.Unmarshal(msg.Params, &perm); err != nil {
            resp := Message{
                Type:      "file_chmoded",
                RequestID: msg.RequestID,
                Error:     "invalid permission",
            }
            c.sendMessage(resp)
            return
        }
        err := fileops.Chmod(msg.Path, perm)
        resp := Message{
            Type:      "file_chmoded",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        }
        c.sendMessage(resp)

    case "file_zip":
        var destination string
        if err := json.Unmarshal(msg.Params, &destination); err != nil {
            resp := Message{
                Type:      "file_zipped",
                RequestID: msg.RequestID,
                Error:     "invalid destination",
            }
            c.sendMessage(resp)
            return
        }
        output, err := fileops.Zip(msg.Path, destination)
        resp := Message{
            Type:      "file_zipped",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        } else {
            resp.Result = output
        }
        c.sendMessage(resp)

    case "file_unzip":
        var destination string
        if err := json.Unmarshal(msg.Params, &destination); err != nil {
            resp := Message{
                Type:      "file_unzipped",
                RequestID: msg.RequestID,
                Error:     "invalid destination",
            }
            c.sendMessage(resp)
            return
        }
        output, err := fileops.Unzip(msg.Path, destination)
        resp := Message{
            Type:      "file_unzipped",
            RequestID: msg.RequestID,
        }
        if err != nil {
            resp.Error = err.Error()
        } else {
            resp.Result = output
        }
        c.sendMessage(resp)

    case "game_deploy":
        c.handleGameDeploy(msg)

    case "game_start":
        c.handleGameStart(msg)

    case "game_stop":
        c.handleGameStop(msg)

    case "game_restart":
        c.handleGameRestart(msg)

    case "game_delete":
        c.handleGameDelete(msg)

    case "game_backup":
        c.handleGameBackup(msg)

    case "game_restore":
        c.handleGameRestore(msg)
    }
}

func (c *Client) executeTask(task Task) {
    log.Printf("Executing task: %s (%s)", task.ID, task.Type)

    var command string
    if cmd, ok := task.Params["command"].(string); ok {
        command = cmd
    }

    result := executor.Execute(command, 60)

    resp := Message{
        Type:   "result",
        TaskID: task.ID,
        Result: result.Output,
    }
    if result.Error != "" {
        resp.Error = result.Error
    }

    c.sendMessage(resp)
}

func (c *Client) handleGameDeploy(msg Message) {
    var params struct {
        Name       string `json:"name"`
        Image      string `json:"image"`
        Version    string `json:"version"`
        Port       int    `json:"port"`
        CPU        int    `json:"cpu"`
        Memory     int    `json:"memory"`
        MaxPlayers int    `json:"maxPlayers"`
        WorldName  string `json:"worldName"`
    }
    if err := json.Unmarshal(msg.Params, &params); err != nil {
        log.Printf("Failed to parse game deploy: %v", err)
        return
    }

    containerName := "game-" + msg.GameID
    image := params.Image
    if params.Version != "" {
        image = image + ":" + params.Version
    }

    if err := docker.PullImage(image); err != nil {
        log.Printf("Failed to pull image: %v", err)
        return
    }

    ports := []string{fmt.Sprintf("%d:25565", params.Port)}
    env := []string{
        fmt.Sprintf("MEMORY=%d", params.Memory),
        fmt.Sprintf("MAX_PLAYERS=%d", params.MaxPlayers),
        fmt.Sprintf("WORLD=%s", params.WorldName),
    }

    _, err := docker.RunContainer(image, containerName, ports, env)
    if err != nil {
        log.Printf("Failed to run container: %v", err)
        return
    }

    c.sendMessage(Message{
        Type:   "game_deploy",
        GameID: msg.GameID,
        Status: "running",
    })
}

func (c *Client) handleGameStart(msg Message) {
    containerName := "game-" + msg.GameID
    err := docker.StartContainer(containerName)
    if err != nil {
        log.Printf("Failed to start game: %v", err)
        c.sendMessage(Message{
            Type:   "game_started",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }
    c.sendMessage(Message{
        Type:   "game_started",
        GameID: msg.GameID,
        Status: "running",
    })
}

func (c *Client) handleGameStop(msg Message) {
    containerName := "game-" + msg.GameID
    err := docker.StopContainer(containerName)
    if err != nil {
        log.Printf("Failed to stop game: %v", err)
        c.sendMessage(Message{
            Type:   "game_stopped",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }
    c.sendMessage(Message{
        Type:   "game_stopped",
        GameID: msg.GameID,
        Status: "stopped",
    })
}

func (c *Client) handleGameRestart(msg Message) {
    containerName := "game-" + msg.GameID
    err := docker.RestartContainer(containerName)
    if err != nil {
        log.Printf("Failed to restart game: %v", err)
        c.sendMessage(Message{
            Type:   "game_restarted",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }
    c.sendMessage(Message{
        Type:   "game_restarted",
        GameID: msg.GameID,
        Status: "running",
    })
}

func (c *Client) handleGameDelete(msg Message) {
    containerName := "game-" + msg.GameID
    docker.StopContainer(containerName)
    err := docker.RemoveContainer(containerName, true)
    if err != nil {
        log.Printf("Failed to delete game: %v", err)
        c.sendMessage(Message{
            Type:   "game_deleted",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }
    c.sendMessage(Message{
        Type:   "game_deleted",
        GameID: msg.GameID,
        Status: "deleted",
    })
}

func (c *Client) handleGameBackup(msg Message) {
    containerName := "game-" + msg.GameID
    backupPath := "/backups/" + msg.GameID + "_" + time.Now().Format("20060102_150405")

    if err := os.MkdirAll(backupPath, 0755); err != nil {
        log.Printf("Failed to create backup dir: %v", err)
        c.sendMessage(Message{
            Type:   "game_backup",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }

    if err := docker.CopyFromContainer(containerName, "/world", backupPath); err != nil {
        log.Printf("Failed to copy world: %v", err)
        c.sendMessage(Message{
            Type:   "game_backup",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }

    c.sendMessage(Message{
        Type:   "game_backup",
        GameID: msg.GameID,
        Status: "completed",
    })
}

func (c *Client) handleGameRestore(msg Message) {
    containerName := "game-" + msg.GameID

    var backupPath string
    if err := json.Unmarshal(msg.Params, &backupPath); err != nil {
        log.Printf("Failed to parse backup path: %v", err)
        c.sendMessage(Message{
            Type:   "game_restore",
            GameID: msg.GameID,
            Error:  "invalid backup path",
        })
        return
    }

    docker.StopContainer(containerName)

    if err := docker.CopyToContainer(containerName, backupPath+"/world", "/world"); err != nil {
        log.Printf("Failed to restore world: %v", err)
        c.sendMessage(Message{
            Type:   "game_restore",
            GameID: msg.GameID,
            Error:  err.Error(),
        })
        return
    }

    docker.StartContainer(containerName)

    c.sendMessage(Message{
        Type:   "game_restore",
        GameID: msg.GameID,
        Status: "restored",
    })
}

func (c *Client) sendRegister() {
    stats := monitor.GetStats()
    msg := Message{
        Type:      "register",
        Hostname:  monitor.GetHostname(),
        Platform:  monitor.GetPlatform(),
        Arch:      "amd64",
        Cpus:      4,
        TotalMem:  8589934592,
        CPU:       stats.CPU,
        Memory:    stats.Memory,
        Disk:      stats.Disk,
        Uptime:    stats.Uptime,
    }
    c.sendMessage(msg)
}

func (c *Client) heartbeat() {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-c.done:
            return
        case <-ticker.C:
            stats := monitor.GetStats()
            msg := Message{
                Type:   "heartbeat",
                CPU:    stats.CPU,
                Memory: stats.Memory,
                Disk:   stats.Disk,
                Uptime: stats.Uptime,
            }
            c.sendMessage(msg)
        }
    }
}

func (c *Client) handleSignals() {
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan
    c.Close()
}

func (c *Client) sendMessage(msg Message) {
    if c.conn == nil {
        return
    }
    if err := c.conn.WriteJSON(msg); err != nil {
        log.Printf("Failed to send message: %v", err)
    }
}

func (c *Client) reconnectLoop() {
    for c.reconnect {
        log.Printf("Reconnecting in 5 seconds...")
        time.Sleep(5 * time.Second)

        if err := c.Connect(); err == nil {
            log.Printf("Reconnected successfully")
            return
        }
    }
}

func (c *Client) Close() {
    c.reconnect = false
    close(c.done)
    if c.conn != nil {
        c.conn.Close()
    }
    log.Printf("Agent stopped")
}