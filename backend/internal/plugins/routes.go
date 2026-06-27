package plugins

import (
    "archive/zip"
    "fmt"
    "io"
    "io/ioutil"
    "os"
    "path/filepath"
    "strings"
    "github.com/gofiber/fiber/v2"
    "github.com/kuropanel/backend/internal/middleware"
)

func SetupRoutes(app *fiber.App, mgr *Manager) {
    api := app.Group("/api/plugins")
    api.Use(middleware.Auth())
    api.Use(middleware.RateLimit())

    api.Get("/", func(c *fiber.Ctx) error {
        return c.JSON(mgr.List())
    })

    api.Get("/:name", func(c *fiber.Ctx) error {
        name := c.Params("name")
        info, ok := mgr.Get(name)
        if !ok {
            return c.Status(404).JSON(fiber.Map{"error": "Plugin not found"})
        }
        return c.JSON(info)
    })

    api.Post("/install", func(c *fiber.Ctx) error {
        file, err := c.FormFile("plugin")
        if err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Plugin file required"})
        }

        src, err := file.Open()
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
        }
        defer src.Close()

        tmpDir := "/tmp/plugin_" + file.Filename
        if err := os.MkdirAll(tmpDir, 0755); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create temp dir"})
        }
        defer os.RemoveAll(tmpDir)

        zipPath := filepath.Join(tmpDir, file.Filename)
        dst, err := os.Create(zipPath)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create zip file"})
        }
        defer dst.Close()

        if _, err := io.Copy(dst, src); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to save zip"})
        }

        extractDir := filepath.Join(tmpDir, "extract")
        if err := os.MkdirAll(extractDir, 0755); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to create extract dir"})
        }

        reader, err := zip.OpenReader(zipPath)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to open zip"})
        }
        defer reader.Close()

        for _, f := range reader.File {
            destPath := filepath.Join(extractDir, f.Name)
            if f.FileInfo().IsDir() {
                os.MkdirAll(destPath, 0755)
                continue
            }

            if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to create dir"})
            }

            srcFile, err := f.Open()
            if err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to open zip entry"})
            }
            defer srcFile.Close()

            dstFile, err := os.Create(destPath)
            if err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to create file"})
            }
            defer dstFile.Close()

            if _, err := io.Copy(dstFile, srcFile); err != nil {
                return c.Status(500).JSON(fiber.Map{"error": "Failed to extract"})
            }
        }

        files, err := ioutil.ReadDir(extractDir)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to read extract dir"})
        }

        var pluginDir string
        for _, f := range files {
            if f.IsDir() {
                pluginDir = filepath.Join(extractDir, f.Name())
                break
            }
        }

        if pluginDir == "" {
            return c.Status(400).JSON(fiber.Map{"error": "No plugin directory found"})
        }

        manifestPath := filepath.Join(pluginDir, "plugin.json")
        if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
            return c.Status(400).JSON(fiber.Map{"error": "plugin.json not found"})
        }

        data, err := ioutil.ReadFile(manifestPath)
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to read manifest"})
        }

        var req InstallRequest
        if err := json.Unmarshal(data, &req); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Invalid manifest"})
        }

        destPluginDir := filepath.Join("/plugins", req.Name)
        if err := os.RemoveAll(destPluginDir); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to remove old plugin"})
        }

        if err := os.Rename(pluginDir, destPluginDir); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to move plugin"})
        }

        if err := mgr.Load(destPluginDir); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to load plugin: %v", err)})
        }

        return c.JSON(fiber.Map{"success": true, "message": "Plugin installed"})
    })

    api.Delete("/:name", func(c *fiber.Ctx) error {
        name := c.Params("name")
        if err := mgr.Uninstall(name); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": err.Error()})
        }
        return c.JSON(fiber.Map{"success": true})
    })

    api.Patch("/:name/enable", func(c *fiber.Ctx) error {
        name := c.Params("name")
        var body struct {
            Enabled bool `json:"enabled"`
        }
        if err := c.BodyParser(&body); err != nil {
            return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
        }

        info, ok := mgr.Get(name)
        if !ok {
            return c.Status(404).JSON(fiber.Map{"error": "Plugin not found"})
        }

        info.Enabled = body.Enabled
        data, err := json.MarshalIndent(info, "", "  ")
        if err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to update config"})
        }

        manifestPath := filepath.Join("/plugins", name, "plugin.json")
        if err := ioutil.WriteFile(manifestPath, data, 0644); err != nil {
            return c.Status(500).JSON(fiber.Map{"error": "Failed to save config"})
        }

        if body.Enabled {
            if err := mgr.Load(filepath.Join("/plugins", name)); err != nil {
                return c.Status(500).JSON(fiber.Map{"error": err.Error()})
            }
        } else {
            if err := mgr.Unload(name); err != nil {
                return c.Status(500).JSON(fiber.Map{"error": err.Error()})
            }
        }

        return c.JSON(fiber.Map{"success": true})
    })
}