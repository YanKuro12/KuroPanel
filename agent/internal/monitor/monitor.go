package monitor

import (
    "os"
    "runtime"
    "time"
)

type Stats struct {
    CPU    float64
    Memory float64
    Disk   float64
    Uptime float64
}

func GetStats() Stats {
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)

    totalMemory := float64(runtime.NumCPU() * 1024 * 1024 * 1024)
    usedMemory := float64(memStats.Alloc)

    return Stats{
        CPU:    float64(runtime.NumCPU()) * 0.5,
        Memory: (usedMemory / totalMemory) * 100,
        Disk:   45.2,
        Uptime: float64(time.Now().Unix() - 1000),
    }
}

func GetHostname() string {
    name, _ := os.Hostname()
    return name
}

func GetPlatform() string {
    return runtime.GOOS + "/" + runtime.GOARCH
}