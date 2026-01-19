// Package search implements adapter search and ranking logic.
package search

import (
	"sort"
	"strings"
	"sync"
	"time"
)

// SearchResult represents a discoverable adapter.
type SearchResult struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description,omitempty"`
	Author        string    `json:"author"`
	Task          string    `json:"task"` // CAUSAL_LM, SEQ_CLS
	Downloads     int       `json:"downloads"`
	Likes         int       `json:"likes"`
	TrendingScore float64   `json:"trending_score"`
	Tags          []string  `json:"tags"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Engine handles search queries and indexing.
type Engine struct {
	mu    sync.RWMutex
	index map[string]*SearchResult
	lists map[string][]*SearchResult // Cached lists (trending, new, etc.)
}

// NewEngine creates a new search engine.
func NewEngine() *Engine {
	e := &Engine{
		index: make(map[string]*SearchResult),
		lists: make(map[string][]*SearchResult),
	}
	e.seedMockData() // For demo purposes
	return e
}

// Search performs a query against the index.
func (e *Engine) Search(query string, task string) []*SearchResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var results []*SearchResult
	query = strings.ToLower(query)

	for _, item := range e.index {
		// Filter by task
		if task != "" && item.Task != task {
			continue
		}

		// Text match
		if query == "" || strings.Contains(strings.ToLower(item.Name), query) ||
			strings.Contains(strings.ToLower(item.Description), query) {
			results = append(results, item)
		}
	}

	// Simple ranking by trending score
	sort.Slice(results, func(i, j int) bool {
		return results[i].TrendingScore > results[j].TrendingScore
	})

	return results
}

// GetTrending returns top trending adapters.
func (e *Engine) GetTrending(limit int) []*SearchResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// In real impl, this would be cached
	var all []*SearchResult
	for _, item := range e.index {
		all = append(all, item)
	}

	sort.Slice(all, func(i, j int) bool {
		return all[i].TrendingScore > all[j].TrendingScore
	})

	if limit > len(all) {
		limit = len(all)
	}
	return all[:limit]
}

func (e *Engine) seedMockData() {
	e.index["1"] = &SearchResult{
		ID: "1", Name: "llama-2-chat-medical", Description: "Fine-tuned for medical advice",
		Author: "med_team", Task: "CAUSAL_LM", Downloads: 1500, Likes: 340, TrendingScore: 95.5,
		Tags: []string{"medical", "llama2", "chat"}, UpdatedAt: time.Now(),
	}
	e.index["2"] = &SearchResult{
		ID: "2", Name: "mistral-code-helper", Description: "Better coding capabilities",
		Author: "dev_corp", Task: "CAUSAL_LM", Downloads: 8900, Likes: 1200, TrendingScore: 98.2,
		Tags: []string{"coding", "mistral", "python"}, UpdatedAt: time.Now(),
	}
	e.index["3"] = &SearchResult{
		ID: "3", Name: "bert-sentiment-finance", Description: "Sentiment analysis for financial news",
		Author: "fin_data", Task: "SEQ_CLS", Downloads: 450, Likes: 89, TrendingScore: 75.0,
		Tags: []string{"finance", "sentiment", "bert"}, UpdatedAt: time.Now(),
	}
}
