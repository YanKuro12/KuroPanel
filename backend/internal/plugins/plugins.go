package plugins

import (
    "encoding/json"
    "io/ioutil"
    "os"
    "path/filepath"
    "plugin"
    "sync"
    "github.com/gofiber/fiber/v2"
    "github.com/yankuro12/kuropanel/backend/internal/middleware"
)

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
    Config      map[string]interface{} `json:"config"`
}

type RouteInfo struct {
    Path   string `json:"path"`
    Method string `json:"method"`
}

type PluginInterface interface {
    Name() string
    Version() string
    Init(db interface{}, config map[string]interface{}) error
    Register(app *fiber.App) error
}

type PluginManager struct {
    mu      sync.RWMutex
    plugins map[string]PluginInterface
    infos   map[string]PluginInfo
    configs map[string]map[string]interface{}
    db      interface{}
    app     *fiber.App
}

func NewPluginManager(app *fiber.App, db interface{}) *PluginManager {
    return &PluginManager{
        plugins: make(map[string]PluginInterface),
        infos:   make(map[string]PluginInfo),
        configs: make(map[string]map[string]interface{}),
        db:      db,
        app:     app,
    }
}

func (m *PluginManager) LoadAll() error {
    files, err := filepath.Glob("/plugins/*/plugin.json")
    if err != nil {
        return err
    }

    for _, file := range files {
        dir := filepath.Dir(file)
        if err := m.Load(dir); err != nil {
            continue
        }
    }
    return nil
}

func (m *PluginManager) Load(dir string) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    manifestPath := filepath.Join(dir, "plugin.json")
    data, err := ioutil.ReadFile(manifestPath)
    if err != nil {
        return err
    }

    var info PluginInfo
    if err := json.Unmarshal(data, &info); err != nil {
        return err
    }

    if !info.Enabled {
        return nil
    }

    mainPath := filepath.Join(dir, info.Main)
    p, err := plugin.Open(mainPath)
    if err != nil {
        return err
    }

    sym, err := p.Lookup(info.Entrypoint)
    if err != nil {
        return err
    }

    pl, ok := sym.(PluginInterface)
    if !ok {
        return nil
    }

    config := info.Config
    if config == nil {
        config = make(map[string]interface{})
    }

    if err := pl.Init(m.db, config); err != nil {
        return err
    }

    if err := pl.Register(m.app); err != nil {
        return err
    }

    m.plugins[info.Name] = pl
    m.infos[info.Name] = info
    m.configs[info.Name] = config

    return nil
}

func (m *PluginManager) List() map[string]PluginInfo {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return m.infos
}