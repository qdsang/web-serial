package bridge

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/influxdata/influxdb-client-go/v2"
)

type StorageManager struct {
	config       *Config
	influxClient influxdb2.Client
}

func NewStorageManager(config *Config, client influxdb2.Client) *StorageManager {
	return &StorageManager{
		config:       config,
		influxClient: client,
	}
}

// 设置InfluxDB客户端
func (s *StorageManager) SetInfluxClient(client influxdb2.Client) {
	s.influxClient = client
}

// 保存数据点
func (s *StorageManager) SaveDataPoint(measurement string, tags map[string]string, fields map[string]interface{}) error {
	if s.config.UseInfluxDB {
		// 使用InfluxDB
		writeAPI := s.influxClient.WriteAPIBlocking(s.config.InfluxDBOrg, s.config.InfluxDBBucket)
		p := influxdb2.NewPoint(
			measurement,
			tags,
			fields,
			time.Now(),
		)
		return writeAPI.WritePoint(context.Background(), p)
	} else {
		// 使用内置数据库（这里使用JSON文件作为示例）
		data := map[string]interface{}{
			"measurement": measurement,
			"tags":        tags,
			"fields":      fields,
			"timestamp":   time.Now(),
		}
		fileName := fmt.Sprintf("%s_%d.json", measurement, time.Now().Unix())
		filePath := filepath.Join("data", fileName)
		
		// 确保数据目录存在
		os.MkdirAll("data", 0755)
		
		// 保存数据到文件
		jsonData, err := json.Marshal(data)
		if err != nil {
			return err
		}
		return ioutil.WriteFile(filePath, jsonData, 0644)
	}
}

// 查询数据
func (s *StorageManager) QueryData(measurement string, start, end time.Time) ([]map[string]interface{}, error) {
	if s.config.UseInfluxDB {
		// 使用InfluxDB查询
		queryAPI := s.influxClient.QueryAPI(s.config.InfluxDBOrg)
		query := fmt.Sprintf(`from(bucket:"%s")
		|> range(start: %s, stop: %s)
		|> filter(fn: (r) => r["_measurement"] == "%s")`,
			s.config.InfluxDBBucket,
			start.Format(time.RFC3339),
			end.Format(time.RFC3339),
			measurement)

		result, err := queryAPI.Query(context.Background(), query)
		if err != nil {
			return nil, err
		}

		var data []map[string]interface{}
		for result.Next() {
			record := make(map[string]interface{})
			record["time"] = result.Record().Time()
			record["value"] = result.Record().Value()
			for k, v := range result.Record().Values() {
				record[k] = v
			}
			data = append(data, record)
		}
		return data, nil
	} else {
		// 使用内置数据库查询（从JSON文件读取）
		var data []map[string]interface{}
		files, err := ioutil.ReadDir("data")
		if err != nil {
			return nil, err
		}

		for _, file := range files {
			if !file.IsDir() && filepath.Ext(file.Name()) == ".json" {
				content, err := ioutil.ReadFile(filepath.Join("data", file.Name()))
				if err != nil {
					continue
				}

				var record map[string]interface{}
				if err := json.Unmarshal(content, &record); err != nil {
					continue
				}

				// 检查时间范围和measurement
				if record["measurement"] == measurement {
					timestamp, ok := record["timestamp"].(string)
					if !ok {
						continue
					}

					t, err := time.Parse(time.RFC3339, timestamp)
					if err != nil {
						continue
					}

					if (t.After(start) || t.Equal(start)) && (t.Before(end) || t.Equal(end)) {
						data = append(data, record)
					}
				}
			}
		}
		return data, nil
	}
}