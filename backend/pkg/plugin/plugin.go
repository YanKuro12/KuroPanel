package plugin

import (
    "plugin"
    "github.com/gofiber/fiber/v2"
)

type Plugin interface {
    Name() string
    Version() string
    Register(app *fiber.App, db interface{})
    Routes() []Route
}

type Route struct {
    Path    string
    Method  string
    Handler func(*fiber.Ctx) error
}

type Manager struct {
    plugins map[string]Plugin
}

func NewManager() *Manager {
    return &Manager{
        plugins: make(map[string]Plugin),
    }
}

func (m *Manager) Load(path string) error {
    p, err := plugin.Open(path)
    if err != nil {
        return err
    }

    sym, err := p.Lookup("Plugin")
    if err != nil {
        return err
    }

    pl, ok := sym.(Plugin)
    if !ok {
        return err
    }

    m.plugins[pl.Name()] = pl
    return nil
}

func (m *Manager) RegisterAll(app *fiber.App, db interface{}) {
    for _, p := range m.plugins {
        p.Register(app, db)
    }
}