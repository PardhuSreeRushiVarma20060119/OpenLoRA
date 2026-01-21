// Package aggregator provides a client that aggregates data from all OpenLoRA services.
package aggregator

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds service endpoints.
type Config struct {
	OrchestratorURL string
	ExperimentsURL  string
	DatasetsURL     string
	AdaptersURL     string
	MetricsURL      string
	DeployURL       string
	MarketplaceURL  string
	UniversityURL   string
}

// Aggregator fetches and combines data from backend services.
type Aggregator struct {
	config Config
	client *http.Client
}

// New creates a new Aggregator.
func New(cfg Config) *Aggregator {
	return &Aggregator{
		config: cfg,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// SystemStatus represents the health of all services.
type SystemStatus struct {
	Orchestrator string `json:"orchestrator"`
	Experiments  string `json:"experiments"`
	Datasets     string `json:"datasets"`
	Adapters     string `json:"adapters"`
	Metrics      string `json:"metrics"`
	Deploy       string `json:"deploy"`
	Marketplace  string `json:"marketplace"`
	University   string `json:"university"`
}

// GetSystemStatus checks health of all services.
func (a *Aggregator) GetSystemStatus() SystemStatus {
	return SystemStatus{
		Orchestrator: a.checkHealth(a.config.OrchestratorURL),
		Experiments:  a.checkHealth(a.config.ExperimentsURL),
		Datasets:     a.checkHealth(a.config.DatasetsURL),
		Adapters:     a.checkHealth(a.config.AdaptersURL),
		Metrics:      a.checkHealth(a.config.MetricsURL),
		Deploy:       a.checkHealth(a.config.DeployURL),
		Marketplace:  a.checkHealth(a.config.MarketplaceURL),
		University:   a.checkHealth(a.config.UniversityURL),
	}
}

func (a *Aggregator) checkHealth(baseURL string) string {
	resp, err := a.client.Get(baseURL + "/health")
	if err != nil {
		return "offline"
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return "healthy"
	}
	return "unhealthy"
}

// DashboardData represents aggregated data for the dashboard.
type DashboardData struct {
	TotalAdapters    int                      `json:"total_adapters"`
	TotalExperiments int                      `json:"total_experiments"`
	TotalDatasets    int                      `json:"total_datasets"`
	TrendingAdapters []map[string]interface{} `json:"trending_adapters"`
	RecentMetrics    []map[string]interface{} `json:"recent_metrics"`
}

// GetDashboard aggregates data for a dashboard view.
func (a *Aggregator) GetDashboard() (*DashboardData, error) {
	data := &DashboardData{}

	// Fetch trending adapters from marketplace
	trending, err := a.fetchJSON(a.config.MarketplaceURL + "/trending?limit=5")
	if err == nil {
		if arr, ok := trending.([]interface{}); ok {
			for _, item := range arr {
				if m, ok := item.(map[string]interface{}); ok {
					data.TrendingAdapters = append(data.TrendingAdapters, m)
				}
			}
			data.TotalAdapters = len(arr)
		}
	}

	// Fetch recent metrics
	metrics, err := a.fetchJSON(a.config.MetricsURL + "/metrics")
	if err == nil {
		if arr, ok := metrics.([]interface{}); ok {
			for _, item := range arr {
				if m, ok := item.(map[string]interface{}); ok {
					data.RecentMetrics = append(data.RecentMetrics, m)
				}
			}
		}
	}

	return data, nil
}

func (a *Aggregator) fetchJSON(url string) (interface{}, error) {
	resp, err := a.client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// ProxyRequest forwards a request to a backend service.
func (a *Aggregator) ProxyRequest(service, path string) ([]byte, error) {
	var baseURL string
	switch service {
	case "orchestrator":
		baseURL = a.config.OrchestratorURL
	case "experiments":
		baseURL = a.config.ExperimentsURL
	case "datasets":
		baseURL = a.config.DatasetsURL
	case "adapters":
		baseURL = a.config.AdaptersURL
	case "metrics":
		baseURL = a.config.MetricsURL
	case "deploy":
		baseURL = a.config.DeployURL
	case "marketplace":
		baseURL = a.config.MarketplaceURL
	case "university":
		baseURL = a.config.UniversityURL
	default:
		return nil, fmt.Errorf("unknown service: %s", service)
	}

	resp, err := a.client.Get(baseURL + path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
