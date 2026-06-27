package models

import "time"

type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    Password  string    `json:"-"`
    Name      string    `json:"name"`
    Role      string    `json:"role"`
    CreatedAt time.Time `json:"created_at"`
}

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
    CreatedAt time.Time `json:"created_at"`
}

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