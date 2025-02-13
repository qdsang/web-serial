package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/webview/webview"
	"./bridge"
)

func main() {
	debug := flag.Bool("debug", false, "Enable debug mode")
	flag.Parse()

	// 创建webview实例
	w := webview.New(*debug)
	defer w.Destroy()

	// 设置窗口标题和大小
	w.SetTitle("Serial Debug Tool")
	w.SetSize(1024, 768, webview.HintNone)

	// 创建bridge实例
	b := bridge.New(w)

	// 注册JavaScript桥接函数
	w.Bind("initSerial", b.InitSerial)
	w.Bind("writeSerial", b.WriteSerial)
	w.Bind("readSerial", b.ReadSerial)
	w.Bind("saveFile", b.SaveFile)
	w.Bind("readFile", b.ReadFile)
	w.Bind("listDirectory", b.ListDirectory)

	// 获取应用资源路径
	var resourcePath string
	if *debug {
		resourcePath = "http://localhost:5173"
	} else {
		exePath, err := os.Executable()
		if err != nil {
			log.Fatal(err)
		}
		resourceDir := filepath.Dir(exePath)
		if runtime.GOOS == "darwin" {
			resourceDir = filepath.Join(resourceDir, "../Resources")
		}
		resourcePath = fmt.Sprintf("file://%s/dist/index.html", resourceDir)
	}

	// 加载前端页面
	w.Navigate(resourcePath)

	// 运行主循环
	w.Run()
}