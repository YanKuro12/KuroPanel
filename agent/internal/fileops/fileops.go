package fileops

import (
    "encoding/base64"
    "io/ioutil"
    "os"
    "path/filepath"
)

func ReadFile(path string) (string, error) {
    content, err := ioutil.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(content), nil
}

func WriteFile(path string, content string) error {
    return ioutil.WriteFile(path, []byte(content), 0644)
}

func Create(path string, isDir bool) error {
    if isDir {
        return os.MkdirAll(path, 0755)
    }
    return WriteFile(path, "")
}

func Delete(path string) error {
    info, err := os.Stat(path)
    if err != nil {
        return err
    }
    if info.IsDir() {
        return os.RemoveAll(path)
    }
    return os.Remove(path)
}

func Rename(oldPath, newPath string) error {
    return os.Rename(oldPath, newPath)
}

func Upload(path string, contentBase64 string) error {
    content, err := base64.StdEncoding.DecodeString(contentBase64)
    if err != nil {
        return err
    }
    dir := filepath.Dir(path)
    if err := os.MkdirAll(dir, 0755); err != nil {
        return err
    }
    return ioutil.WriteFile(path, content, 0644)
}

func Download(path string) (string, error) {
    content, err := ioutil.ReadFile(path)
    if err != nil {
        return "", err
    }
    return base64.StdEncoding.EncodeToString(content), nil
}

func Chmod(path string, perm string) error {
    var mode os.FileMode
    fmt.Sscanf(perm, "%o", &mode)
    return os.Chmod(path, mode)
}

func Zip(source, destination string) (string, error) {
    cmd := exec.Command("zip", "-r", destination, ".")
    cmd.Dir = source
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    err := cmd.Run()
    return out.String(), err
}

func Unzip(path, destination string) (string, error) {
    cmd := exec.Command("unzip", "-o", path, "-d", destination)
    var out bytes.Buffer
    cmd.Stdout = &out
    cmd.Stderr = &out
    err := cmd.Run()
    return out.String(), err
}