package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "github.com/gofiber/fiber/v2"
)

type DiscordNotifier struct {
    config map[string]interface{}
    db     interface{}
}

func (p *DiscordNotifier) Name() string {
    return "DiscordNotifier"
}

func (p *DiscordNotifier) Version() string {
    return "1.0.0"
}

func (p *DiscordNotifier) Init(db interface{}, config map[string]interface{}) error {
    p.db = db
    p.config = config
    return nil
}

func (p *DiscordNotifier) Register(app *fiber.App) error {
    app.Post("/api/plugins/discord/webhook", p.handleWebhook)
    app.Get("/api/plugins/discord/config", p.getConfig)
    return nil
}

func (p *DiscordNotifier) handleWebhook(c *fiber.Ctx) error {
    var body struct {
        Message string `json:"message"`
        Webhook string `json:"webhook"`
    }
    if err := c.BodyParser(&body); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }

    webhook := body.Webhook
    if webhook == "" {
        if val, ok := p.config["webhook"].(string); ok {
            webhook = val
        }
    }

    if webhook == "" {
        return c.Status(400).JSON(fiber.Map{"error": "Webhook not configured"})
    }

    payload, _ := json.Marshal(map[string]string{"content": body.Message})
    resp, err := http.Post(webhook, "application/json", bytes.NewBuffer(payload))
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    defer resp.Body.Close()

    return c.JSON(fiber.Map{"success": true})
}

func (p *DiscordNotifier) getConfig(c *fiber.Ctx) error {
    return c.JSON(p.config)
}

func (p *DiscordNotifier) OnTaskComplete(task map[string]interface{}) {
    p.sendNotification(fmt.Sprintf("Task %s completed on node %s", task["id"], task["node_id"]))
}

func (p *DiscordNotifier) OnNodeOffline(node map[string]interface{}) {
    p.sendNotification(fmt.Sprintf("Node %s is offline!", node["name"]))
}

func (p *DiscordNotifier) sendNotification(message string) {
    webhook, ok := p.config["webhook"].(string)
    if !ok || webhook == "" {
        return
    }
    payload, _ := json.Marshal(map[string]string{"content": message})
    http.Post(webhook, "application/json", bytes.NewBuffer(payload))
}

var Plugin DiscordNotifier