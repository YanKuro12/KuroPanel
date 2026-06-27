package main

import (
    "encoding/json"
    "flag"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"
    "github.com/gorilla/websocket"
    "github.com/kuropanel/agent/internal/monitor"
    "github.com/kuropanel/agent/internal/executor"
    "github.com/kuropanel/agent/internal/fileops"
)

type Config struct {
    PanelURL string
    Token    string
    Name     string
}

type Message struct {
    Type      string          `json:"type"`
    RequestID string          `json:"request_id,omitempty"`
    TaskID    string          `json:"task_id,omitempty"`
    Path      string          `json:"path,omitempty"`
    Content   string          `json:"content,omitempty"`
    Command   string          `json:"command,omitempty"`
    Params    json.RawMessage `json:"params,omitempty"`
    Result    string          `json:"result,omitempty"`
    Error     string          `json:"error,omitempty"`
    CPU       float64         `json:"cpu,omitempty"`
    Memory    float64         `json:"memory,omitempty"`
    Disk      float64         `json:"disk,omitempty"`
    Uptime    float64         `json:"uptime,omitempty"`
    Hostname  string          `json:"hostname,omitempty"`
    Platform  string          `json:"platform,omitempty"`
    Arch      string          `json:"arch,omitempty"`
    Cpus      int             `json:"cpus,omitempty"`
}

var (
    panelURL string
    token    string
    name     string
    conn     *websocket.Conn
)

func main() {
    flag.StringVar(&panelURL, "url", "", "Panel WebSocket URL")
    flag.StringVar(&token, "token", "", "Node token")
    flag.StringVar(&name, "name", "", "Node name")
    flag.Parse()

    if panelURL == "" || token == "" {
        log.Fatal("URL and token are required")
    }

    if name == "" {
        name, _ = os.Hostname()
    }

    log.Printf("Starting KuroD agent: %s", name)

    connect()

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    conn.Close()
    log.Println("Agent stopped")
}

func connect() {
    var err error
    conn, _, err = websocket.DefaultDialer.Dial(panelURL, nil)
    if err != nil {
        log.Printf("Failed to connect: %v, retrying in 5s...", err)
        time.Sleep(5 * time.Second)
        connect()
        return
    }

    log.Println("Connected to panel")

    sendRegister()

    go heartbeat()

    go handleMessages()
}

func sendRegister() {
    hostname, _ := os.Hostname()
    msg := Message{
        Type:     "register",
        Hostname: hostname,
        Platform: "linux",
        Arch:     "amd64",
    }
    conn.WriteJSON(msg)
}

func heartbeat() {
    ticker := time.NewTicker(5 * time.Second)
    for range ticker.C {
        stats := monitor.GetStats()
        msg := Message{
            Type:   "heartbeat",
            CPU:    stats.CPU,
            Memory: stats.Memory,
            Disk:   stats.Disk,
            Uptime: stats.Uptime,
        }
        conn.WriteJSON(msg)
    }
}

func handleMessages() {
    for {
        var msg Message
        if err := conn.ReadJSON(&msg); err != nil {
            log.Printf("Read error: %v", err)
            connect()
            return
        }

        switch msg.Type {
        case "task":
            handleTask(msg)
        case "file_read":
            handleFileRead(msg)
        case "file_save":
            handleFileSave(msg)
        case "file_create":
            handleFileCreate(msg)
        case "file_delete":
            handleFileDelete(msg)
        case "file_rename":
            handleFileRename(msg)
        case "file_upload":
            handleFileUpload(msg)
        case "file_download":
            handleFileDownload(msg)
        case "file_chmod":
            handleFileChmod(msg)
        case "file_zip":
            handleFileZip(msg)
        case "file_unzip":
            handleFileUnzip(msg)
        }
    }
}

func handleTask(msg Message) {
    var params map[string]interface{}
    json.Unmarshal(msg.Params, &params)

    result, err := executor.Execute(msg.Command, params)
    resp := Message{
        Type:    "result",
        TaskID:  msg.TaskID,
        Result:  result,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileRead(msg Message) {
    content, err := fileops.ReadFile(msg.Path)
    resp := Message{
        Type:      "file_content",
        RequestID: msg.RequestID,
        Content:   content,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileSave(msg Message) {
    err := fileops.WriteFile(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_saved",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileCreate(msg Message) {
    err := fileops.Create(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_created",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileDelete(msg Message) {
    err := fileops.Delete(msg.Path)
    resp := Message{
        Type:      "file_deleted",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileRename(msg Message) {
    err := fileops.Rename(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_renamed",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileUpload(msg Message) {
    err := fileops.Upload(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_uploaded",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileDownload(msg Message) {
    content, err := fileops.Download(msg.Path)
    resp := Message{
        Type:      "file_downloaded",
        RequestID: msg.RequestID,
        Content:   content,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileChmod(msg Message) {
    err := fileops.Chmod(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_chmoded",
        RequestID: msg.RequestID,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileZip(msg Message) {
    result, err := fileops.Zip(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_zipped",
        RequestID: msg.RequestID,
        Result:    result,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}

func handleFileUnzip(msg Message) {
    result, err := fileops.Unzip(msg.Path, msg.Content)
    resp := Message{
        Type:      "file_unzipped",
        RequestID: msg.RequestID,
        Result:    result,
    }
    if err != nil {
        resp.Error = err.Error()
    }
    conn.WriteJSON(resp)
}