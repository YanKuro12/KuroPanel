package plugins

import "time"

type PluginInfo struct {
    Name        string                 `json:"name"`
    Version     string                 `json:"version"`
    Author      string                 `json:"author"`
    Description string                 `json:"description"`
    Main        string                 `json:"main"`
    Entrypoint  string                 `json:"entrypoint"`
    Permissions []string               `json:"permissions"`
    Hooks       map[string]bool        `json:"hooks"`
    Routes      []RouteInfo            `json:"routes"`
    Enabled     bool                   `json:"enabled"`
    InstalledAt time.Time              `json:"installed_at"`
    Config      map[string]interface{} `json:"config"`
}

type RouteInfo struct {
    Path   string `json:"path"`
    Method string `json:"method"`
}

type InstallRequest struct {
    Name        string                 `json:"name"`
    Version     string                 `json:"version"`
    Author      string                 `json:"author"`
    Description string                 `json:"description"`
    Permissions []string               `json:"permissions"`
    Hooks       map[string]bool        `json:"hooks"`
    Config      map[string]interface{} `json:"config"`
}