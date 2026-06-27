package plugins

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
    "path/filepath"
    "plugin"
    "sync"
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/kuropanel/backend/pkg/plugin"
)

type Manager struct {
    mu      sync.RWMutex
    plugins map[string]plugin.Plugin
    infos   map[string]PluginInfo
    configs map[string]map[string]interface{}
    db      interface{}
    app     *fiber.App
}

func NewManager(app *fiber.App, db interface{}) *Manager {
    return &Manager{
        plugins: make(map[string]plugin.Plugin),
        infos:   make(map[string]PluginInfo),
        configs: make(map[string]map[string]interface{}),
        db:      db,
        app:     app,
    }
}

func (m *Manager) LoadAll() error {
    files, err := filepath.Glob("/plugins/*/plugin.json")
    if err != nil {
        return err
    }

    for _, file := range files {
        dir := filepath.Dir(file)
        if err := m.Load(dir); err != nil {
            fmt.Printf("Failed to load plugin %s: %v\n", dir, err)
        }
    }
    return nil
}

func (m *Manager) Load(dir string) error {
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
    if _, err := os.Stat(mainPath); os.IsNotExist(err) {
        return fmt.Errorf("plugin binary not found: %s", mainPath)
    }

    p, err := plugin.Open(mainPath)
    if err != nil {
        return err
    }

    sym, err := p.Lookup(info.Entrypoint)
    if err != nil {
        return err
    }

    pl, ok := sym.(plugin.Plugin)
    if !ok {
        return fmt.Errorf("plugin does not implement Plugin interface")
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

    info.InstalledAt = time.Now()
    m.plugins[info.Name] = pl
    m.infos[info.Name] = info
    m.configs[info.Name] = config

    fmt.Printf("Loaded plugin: %s v%s\n", info.Name, info.Version)
    return nil
}

func (m *Manager) Unload(name string) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    delete(m.plugins, name)
    delete(m.infos, name)
    delete(m.configs, name)

    return nil
}

func (m *Manager) Install(dir string, req InstallRequest) error {
    pluginDir := filepath.Join("/plugins", req.Name)
    if err := os.MkdirAll(pluginDir, 0755); err != nil {
        return err
    }

    info := PluginInfo{
        Name:        req.Name,
        Version:     req.Version,
        Author:      req.Author,
        Description: req.Description,
        Main:        "main.so",
        Entrypoint:  "Plugin",
        Permissions: req.Permissions,
        Hooks:       req.Hooks,
        Enabled:     true,
        Config:      req.Config,
        InstalledAt: time.Now(),
    }

    data, err := json.MarshalIndent(info, "", "  ")
    if err != nil {
        return err
    }

    manifestPath := filepath.Join(pluginDir, "plugin.json")
    if err := ioutil.WriteFile(manifestPath, data, 0644); err != nil {
        return err
    }

    return m.Load(pluginDir)
}

func (m *Manager) Uninstall(name string) error {
    if err := m.Unload(name); err != nil {
        return err
    }

    pluginDir := filepath.Join("/plugins", name)
    if err := os.RemoveAll(pluginDir); err != nil {
        return err
    }

    return nil
}

func (m *Manager) List() map[string]PluginInfo {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return m.infos
}

func (m *Manager) Get(name string) (PluginInfo, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    info, ok := m.infos[name]
    return info, ok
}

func (m *Manager) GetPlugin(name string) (plugin.Plugin, bool) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    p, ok := m.plugins[name]
    return p, ok
}

func (m *Manager) TriggerHook(pluginName string, hookName string, data map[string]interface{}) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    p, ok := m.plugins[pluginName]
    if !ok {
        return
    }

    hook, ok := p.(plugin.HookPlugin)
    if !ok {
        return
    }

    switch hookName {
    case "onTaskComplete":
        hook.OnTaskComplete(data)
    case "onNodeOffline":
        hook.OnNodeOffline(data)
    case "onGameStart":
        hook.OnGameStart(data)
    case "onBackup":
        hook.OnBackup(data)
    case "onNodeOnline":
        hook.OnNodeOnline(data)
    case "onTaskFailed":
        hook.OnTaskFailed(data)
    }
}

func (m *Manager) TriggerAllHooks(hookName string, data map[string]interface{}) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    for name, p := range m.plugins {
        hook, ok := p.(plugin.HookPlugin)
        if !ok {
            continue
        }

        info := m.infos[name]
        if !info.Hooks[hookName] {
            continue
        }

        switch hookName {
        case "onTaskComplete":
            hook.OnTaskComplete(data)
        case "onNodeOffline":
            hook.OnNodeOffline(data)
        case "onGameStart":
            hook.OnGameStart(data)
        case "onBackup":
            hook.OnBackup(data)
        case "onNodeOnline":
            hook.OnNodeOnline(data)
        case "onTaskFailed":
            hook.OnTaskFailed(data)
        }
    }
}