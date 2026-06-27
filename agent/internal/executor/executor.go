package executor

import (
    "bytes"
    "fmt"
    "os/exec"
    "strings"
    "time"
)

type Result struct {
    Output   string `json:"output"`
    Error    string `json:"error"`
    ExitCode int    `json:"exit_code"`
    Duration int64  `json:"duration"`
}

func Execute(command string, timeout int) Result {
    start := time.Now()
    var out bytes.Buffer
    var stderr bytes.Buffer

    cmd := exec.Command("sh", "-c", command)
    cmd.Stdout = &out
    cmd.Stderr = &stderr

    err := cmd.Run()
    duration := time.Since(start).Milliseconds()

    result := Result{
        Output:   out.String(),
        Duration: duration,
    }

    if err != nil {
        result.Error = stderr.String()
        if exitErr, ok := err.(*exec.ExitError); ok {
            result.ExitCode = exitErr.ExitCode()
        } else {
            result.ExitCode = 1
            result.Error = err.Error()
        }
    } else {
        result.ExitCode = 0
    }

    return result
}

func ExecuteWithTimeout(command string, timeout int) Result {
    done := make(chan Result, 1)
    go func() {
        done <- Execute(command, timeout)
    }()

    select {
    case result := <-done:
        return result
    case <-time.After(time.Duration(timeout) * time.Second):
        return Result{
            Output:   "",
            Error:    "command timed out",
            ExitCode: 124,
            Duration: int64(timeout) * 1000,
        }
    }
}

func ExecuteScript(script string, interpreter string, timeout int) Result {
    if interpreter == "" {
        interpreter = "bash"
    }
    return Execute(interpreter+" -c "+script, timeout)
}

func ExecuteCommand(command string, args []string, timeout int) Result {
    start := time.Now()
    var out bytes.Buffer
    var stderr bytes.Buffer

    cmd := exec.Command(command, args...)
    cmd.Stdout = &out
    cmd.Stderr = &stderr

    err := cmd.Run()
    duration := time.Since(start).Milliseconds()

    result := Result{
        Output:   out.String(),
        Duration: duration,
    }

    if err != nil {
        result.Error = stderr.String()
        if exitErr, ok := err.(*exec.ExitError); ok {
            result.ExitCode = exitErr.ExitCode()
        } else {
            result.ExitCode = 1
            result.Error = err.Error()
        }
    } else {
        result.ExitCode = 0
    }

    return result
}

func ExecuteDockerCommand(action string, container string, args ...string) Result {
    cmdArgs := []string{action, container}
    cmdArgs = append(cmdArgs, args...)
    return ExecuteCommand("docker", cmdArgs, 60)
}

func ExecuteKubectlCommand(args []string, timeout int) Result {
    return ExecuteCommand("kubectl", args, timeout)
}

func ExecuteGitCommand(args []string, timeout int) Result {
    return ExecuteCommand("git", args, timeout)
}

func ExecuteNpmCommand(args []string, timeout int) Result {
    return ExecuteCommand("npm", args, timeout)
}

func ExecutePythonScript(script string, args []string, timeout int) Result {
    cmdArgs := []string{script}
    cmdArgs = append(cmdArgs, args...)
    return ExecuteCommand("python3", cmdArgs, timeout)
}

func ExecuteNodeScript(script string, args []string, timeout int) Result {
    cmdArgs := []string{script}
    cmdArgs = append(cmdArgs, args...)
    return ExecuteCommand("node", cmdArgs, timeout)
}

func IsCommandAvailable(command string) bool {
    _, err := exec.LookPath(command)
    return err == nil
}

func GetCommandOutput(command string, args ...string) (string, error) {
    cmd := exec.Command(command, args...)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    err := cmd.Run()
    return strings.TrimSpace(out.String()), err
}

func GetCommandOutputWithTimeout(command string, args []string, timeout int) (string, error) {
    done := make(chan string, 1)
    errChan := make(chan error, 1)

    go func() {
        output, err := GetCommandOutput(command, args...)
        if err != nil {
            errChan <- err
            return
        }
        done <- output
    }()

    select {
    case output := <-done:
        return output, nil
    case err := <-errChan:
        return "", err
    case <-time.After(time.Duration(timeout) * time.Second):
        return "", fmt.Errorf("command timed out after %d seconds", timeout)
    }
}