package bridge

// Config 存储应用程序的配置信息
type Config struct {
	// InfluxDB相关配置
	UseInfluxDB     bool   `json:"useInfluxDB"`     // 是否使用InfluxDB
	InfluxDBURL     string `json:"influxDBURL"`     // InfluxDB服务器URL
	InfluxDBToken   string `json:"influxDBToken"`   // InfluxDB认证令牌
	InfluxDBOrg     string `json:"influxDBOrg"`     // InfluxDB组织名称
	InfluxDBBucket  string `json:"influxDBBucket"`  // InfluxDB存储桶名称
}

// NewConfig 创建一个新的配置实例
func NewConfig() *Config {
	return &Config{
		UseInfluxDB:     false,                    // 默认不使用InfluxDB
		InfluxDBURL:     "http://localhost:8086", // 默认InfluxDB URL
		InfluxDBToken:   "",
		InfluxDBOrg:     "myorg",                 // 默认组织名称
		InfluxDBBucket:  "mybucket",              // 默认存储桶名称
	}
}