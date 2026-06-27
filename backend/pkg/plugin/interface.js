package plugin

import "github.com/gofiber/fiber/v2"

type Plugin interface {
    Name() string
    Version() string
    Init(db interface{}, config map[string]interface{}) error
    Register(app *fiber.App) error
}

type HookPlugin interface {
    OnTaskComplete(task map[string]interface{})
    OnNodeOffline(node map[string]interface{})
    OnGameStart(game map[string]interface{})
    OnBackup(backup map[string]interface{})
    OnNodeOnline(node map[string]interface{})
    OnTaskFailed(task map[string]interface{})
}

type ConfigurablePlugin interface {
    GetConfig() map[string]interface{}
    SetConfig(config map[string]interface{}) error
}