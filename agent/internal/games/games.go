package games

import (
    "encoding/json"
    "fmt"
    "os/exec"
    "strings"
    "time"
)

type GameDeployMsg struct {
    Type       string `json:"type"`
    GameId     string `json:"gameId"`
    Name       string `json:"name"`
    Image      string `json:"image"`
    Version    string `json:"version"`
    Port       int    `json:"port"`
    CPU        int    `json:"cpu"`
    Memory     int    `json:"memory"`
    MaxPlayers int    `json:"maxPlayers"`
    WorldName  string `json:"worldName"`
}

type GameControlMsg struct {
    Type   string `json:"type"`
    GameId string `json:"gameId"`
}

func HandleGameDeploy(msg []byte) (string, error) {
    var deploy GameDeployMsg
    if err := json.Unmarshal(msg, &deploy); err != nil {
        return "", err
    }

    containerName := "game-" + deploy.GameId
    image := deploy.Image
    if deploy.Version != "" {
        image = image + ":" + deploy.Version
    }

    pullCmd := exec.Command("docker", "pull", image)
    if err := pullCmd.Run(); err != nil {
        return "", fmt.Errorf("Failed to pull image: %v", err)
    }

    runCmd := exec.Command("docker", "run", "-d",
        "--name", containerName,
        "--restart", "unless-stopped",
        "-p", fmt.Sprintf("%d:25565", deploy.Port),
        "-e", fmt.Sprintf("MEMORY=%d", deploy.Memory),
        "-e", fmt.Sprintf("MAX_PLAYERS=%d", deploy.MaxPlayers),
        "-e", fmt.Sprintf("WORLD=%s", deploy.WorldName),
        image,
    )

    output, err := runCmd.CombinedOutput()
    if err != nil {
        return "", fmt.Errorf("Failed to run container: %v, output: %s", err, output)
    }

    return string(output), nil
}

func HandleGameStart(gameId string) error {
    containerName := "game-" + gameId
    cmd := exec.Command("docker", "start", containerName)
    return cmd.Run()
}

func HandleGameStop(gameId string) error {
    containerName := "game-" + gameId
    cmd := exec.Command("docker", "stop", containerName)
    return cmd.Run()
}

func HandleGameRestart(gameId string) error {
    containerName := "game-" + gameId
    cmd := exec.Command("docker", "restart", containerName)
    return cmd.Run()
}

func HandleGameDelete(gameId string) error {
    containerName := "game-" + gameId
    exec.Command("docker", "stop", containerName).Run()
    cmd := exec.Command("docker", "rm", "-f", containerName)
    return cmd.Run()
}

func HandleGameBackup(gameId string, backupId string) error {
    containerName := "game-" + gameId
    backupPath := "/backups/" + gameId + "_" + time.Now().Format("20060102_150405")

    exec.Command("mkdir", "-p", backupPath).Run()

    cmd := exec.Command("docker", "cp", containerName+":/world", backupPath)
    return cmd.Run()
}

func HandleGameRestore(gameId string, backupPath string) error {
    containerName := "game-" + gameId

    exec.Command("docker", "stop", containerName).Run()

    exec.Command("docker", "exec", containerName, "rm", "-rf", "/world").Run()

    cmd := exec.Command("docker", "cp", backupPath+"/world", containerName+":/world")
    if err := cmd.Run(); err != nil {
        return err
    }

    return exec.Command("docker", "start", containerName).Run()
}

func GetGameLogs(gameId string, limit int) ([]string, error) {
    containerName := "game-" + gameId
    cmd := exec.Command("docker", "logs", "--tail", fmt.Sprintf("%d", limit), containerName)
    output, err := cmd.CombinedOutput()
    if err != nil {
        return nil, err
    }
    lines := strings.Split(string(output), "\n")
    return lines, nil
}