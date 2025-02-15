package bridge

import (
	"io/ioutil"
)

type FileManager struct {}

func NewFileManager() *FileManager {
	return &FileManager{}
}

// 保存文件
func (f *FileManager) SaveFile(path string, data string) error {
	return ioutil.WriteFile(path, []byte(data), 0644)
}

// 读取文件
func (f *FileManager) ReadFile(path string) (string, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// 列出目录内容
func (f *FileManager) ListDirectory(path string) ([]string, error) {
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var fileList []string
	for _, file := range files {
		fileList = append(fileList, file.Name())
	}
	return fileList, nil
}