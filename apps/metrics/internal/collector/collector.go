// Package collector handles metrics collection and aggregation.
package collector

import (
	"sync"
	"time"
)

// MetricType categorizes metrics.
type MetricType string

const (
	MetricGauge   MetricType = "gauge"
	MetricCounter MetricType = "counter"
	MetricHist    MetricType = "histogram"
)

// Metric represents a single metric.
type Metric struct {
	Name      string            `json:"name"`
	Type      MetricType        `json:"type"`
	Value     float64           `json:"value"`
	Labels    map[string]string `json:"labels,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
}

// MetricBatch is a batch of metrics from a source.
type MetricBatch struct {
	Source    string    `json:"source"`
	JobID     string    `json:"job_id,omitempty"`
	AdapterID string    `json:"adapter_id,omitempty"`
	Metrics   []Metric  `json:"metrics"`
	Timestamp time.Time `json:"timestamp"`
}

// AggregatedMetric holds aggregated statistics.
type AggregatedMetric struct {
	Name   string    `json:"name"`
	Count  int64     `json:"count"`
	Sum    float64   `json:"sum"`
	Min    float64   `json:"min"`
	Max    float64   `json:"max"`
	Avg    float64   `json:"avg"`
	Last   float64   `json:"last"`
	LastAt time.Time `json:"last_at"`
}

// Collector aggregates metrics from training jobs.
type Collector struct {
	mu        sync.RWMutex
	metrics   map[string]*AggregatedMetric
	recent    []MetricBatch
	maxRecent int
}

// NewCollector creates a new collector.
func NewCollector() *Collector {
	return &Collector{
		metrics:   make(map[string]*AggregatedMetric),
		recent:    make([]MetricBatch, 0),
		maxRecent: 1000,
	}
}

// Push adds a batch of metrics.
func (c *Collector) Push(batch MetricBatch) {
	c.mu.Lock()
	defer c.mu.Unlock()

	batch.Timestamp = time.Now()

	for _, m := range batch.Metrics {
		key := m.Name
		agg, ok := c.metrics[key]
		if !ok {
			agg = &AggregatedMetric{
				Name: m.Name,
				Min:  m.Value,
				Max:  m.Value,
			}
			c.metrics[key] = agg
		}

		agg.Count++
		agg.Sum += m.Value
		agg.Last = m.Value
		agg.LastAt = m.Timestamp

		if m.Value < agg.Min {
			agg.Min = m.Value
		}
		if m.Value > agg.Max {
			agg.Max = m.Value
		}
		agg.Avg = agg.Sum / float64(agg.Count)
	}

	// Store recent
	c.recent = append(c.recent, batch)
	if len(c.recent) > c.maxRecent {
		c.recent = c.recent[1:]
	}
}

// GetMetric retrieves an aggregated metric.
func (c *Collector) GetMetric(name string) *AggregatedMetric {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.metrics[name]
}

// GetAllMetrics returns all aggregated metrics.
func (c *Collector) GetAllMetrics() []*AggregatedMetric {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make([]*AggregatedMetric, 0, len(c.metrics))
	for _, m := range c.metrics {
		result = append(result, m)
	}
	return result
}

// GetRecentBatches returns recent metric batches.
func (c *Collector) GetRecentBatches(limit int) []MetricBatch {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if limit > len(c.recent) {
		limit = len(c.recent)
	}
	return c.recent[len(c.recent)-limit:]
}

// PrometheusExport returns metrics in Prometheus format.
func (c *Collector) PrometheusExport() string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var out string
	for _, m := range c.metrics {
		out += "# HELP " + m.Name + " Aggregated metric\n"
		out += "# TYPE " + m.Name + " gauge\n"
		out += m.Name + " " + formatFloat(m.Last) + "\n"
	}
	return out
}

func formatFloat(f float64) string {
	return string(rune(int(f*100) / 100)) // Simplified
}
