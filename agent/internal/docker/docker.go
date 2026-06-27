package docker

import (
    "bytes"
    "encoding/json"
    "fmt"
    "os/exec"
    "strings"
)

type Container struct {
    ID     string `json:"id"`
    Name   string `json:"name"`
    Image  string `json:"image"`
    Status string `json:"status"`
    Ports  string `json:"ports"`
}

func PullImage(image string) error {
    cmd := exec.Command("docker", "pull", image)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to pull image: %v, output: %s", err, out.String())
    }
    return nil
}

func RunContainer(image string, name string, ports []string, env []string) (string, error) {
    args := []string{"run", "-d", "--name", name, "--restart", "unless-stopped"}

    for _, p := range ports {
        args = append(args, "-p", p)
    }

    for _, e := range env {
        args = append(args, "-e", e)
    }

    args = append(args, image)

    cmd := exec.Command("docker", args...)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out

    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("failed to run container: %v, output: %s", err, out.String())
    }

    return strings.TrimSpace(out.String()), nil
}

func StopContainer(name string) error {
    cmd := exec.Command("docker", "stop", name)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to stop container: %v, output: %s", err, out.String())
    }
    return nil
}

func StartContainer(name string) error {
    cmd := exec.Command("docker", "start", name)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to start container: %v, output: %s", err, out.String())
    }
    return nil
}

func RestartContainer(name string) error {
    cmd := exec.Command("docker", "restart", name)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to restart container: %v, output: %s", err, out.String())
    }
    return nil
}

func RemoveContainer(name string, force bool) error {
    args := []string{"rm"}
    if force {
        args = append(args, "-f")
    }
    args = append(args, name)

    cmd := exec.Command("docker", args...)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to remove container: %v, output: %s", err, out.String())
    }
    return nil
}

func ContainerExists(name string) bool {
    cmd := exec.Command("docker", "ps", "-a", "--filter", "name="+name, "--format", "{{.Names}}")
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Run()
    return strings.Contains(out.String(), name)
}

func GetContainerLogs(name string, tail int) (string, error) {
    cmd := exec.Command("docker", "logs", "--tail", fmt.Sprintf("%d", tail), name)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("failed to get logs: %v, output: %s", err, out.String())
    }
    return out.String(), nil
}

func GetContainerStatus(name string) (string, error) {
    cmd := exec.Command("docker", "inspect", "--format", "{{.State.Status}}", name)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return "", fmt.Errorf("failed to get status: %v", err)
    }
    return strings.TrimSpace(out.String()), nil
}

func ListContainers() ([]Container, error) {
    cmd := exec.Command("docker", "ps", "-a", "--format", "json")
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out

    if err := cmd.Run(); err != nil {
        return nil, fmt.Errorf("failed to list containers: %v", err)
    }

    var containers []Container
    lines := strings.Split(strings.TrimSpace(out.String()), "\n")

    for _, line := range lines {
        if line == "" {
            continue
        }
        var c Container
        if err := json.Unmarshal([]byte(line), &c); err != nil {
            continue
        }
        containers = append(containers, c)
    }

    return containers, nil
}

func CopyToContainer(containerName string, srcPath string, destPath string) error {
    cmd := exec.Command("docker", "cp", srcPath, containerName+":"+destPath)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to copy to container: %v, output: %s", err, out.String())
    }
    return nil
}

func CopyFromContainer(containerName string, srcPath string, destPath string) error {
    cmd := exec.Command("docker", "cp", containerName+":"+srcPath, destPath)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    if err := cmd.Run(); err != nil {
        return fmt.Errorf("failed to copy from container: %v, output: %s", err, out.String())
    }
    return nil
}

func ExecInContainer(containerName string, command []string) (string, error) {
    args := []string{"exec"}
    args = append(args, containerName)
    args = append(args, command...)

    cmd := exec.Command("docker", args...)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out

    if err := cmd.Run(); err != nil {
        return out.String(), fmt.Errorf("failed to exec in container: %v, output: %s", err, out.String())
    }

    return out.String(), nil
}