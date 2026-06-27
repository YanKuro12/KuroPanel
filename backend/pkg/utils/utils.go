package utils

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "time"
)

func GenerateToken() string {
    bytes := make([]byte, 16)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}

func FormatUptime(seconds float64) string {
    d := time.Duration(seconds) * time.Second
    hours := int(d.Hours())
    minutes := int(d.Minutes()) % 60
    secs := int(d.Seconds()) % 60
    return fmt.Sprintf("%dh %dm %ds", hours, minutes, secs)
}

func FormatSize(bytes int64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := int64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func Contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}