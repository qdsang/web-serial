package bridge

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/tarm/serial"
	"github.com/webview/webview"
)

type Bridge struct {
	view webview.WebView
	port *serial.Port
	mux  sync.Mutex
}

func New(view webview.WebView) *Bridge {
	return &Bridge{view: view}
}

// 初始化串口
func (b *Bridge) InitSerial(portName string, baudRate int) error {
	b.mux.Lock()
	defer b.mux.Unlock()

	if b.port != nil {
		b.port.Close()
	}

	c := &serial.Config{
		Name: portName,
		Baud: baudRate,
	}

	port, err := serial.OpenPort(c)
	if err != nil {
		return err
	}

	b.port = port
	return nil
}

// 写入串口数据
func (b *Bridge) WriteSerial(data []byte) error {
	if b.port == nil {
		return fmt.Errorf("serial port not initialized")
	}

	_, err := b.port.Write(data)
	return err
}

// 读取串口数据
func (b *Bridge) ReadSerial(callback string) {
	if b.port == nil {
		return
	}

	go func() {
		buf := make([]byte, 128)
		for {
			n, err := b.port.Read(buf)
			if err != nil {
				log.Printf("Error reading from serial: %v", err)
				return
			}
			if n > 0 {
				data := buf[:n]
				b.view.Eval(fmt.Sprintf("%s(%s)", callback, string(data)))
			}
		}
	}()
}

// 保存文件
func (b *Bridge) SaveFile(path string, data string) error {
	return ioutil.WriteFile(path, []byte(data), 0644)
}

// 读取文件
func (b *Bridge) ReadFile(path string) (string, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// 列出目录内容
func (b *Bridge) ListDirectory(path string) ([]string, error) {
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var names []string
	for _, f := range files {
		names = append(names, f.Name())
	}
	return names, nil
}