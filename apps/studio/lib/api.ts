/**
 * OpenLoRA Studio — API Client
 *
 * All API calls route through the gateway (NEXT_PUBLIC_API_URL).
 * The gateway reverse-proxies /api/v1/{service}/... to each microservice.
 */

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        // Disable Next.js cache so we always get fresh data
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${path}`);
    }
    return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Orchestrator  (gateway → /api/v1/orchestrator → orchestrator service)
// ---------------------------------------------------------------------------
export const OrchestratorAPI = {
    /** GET /status — cluster-wide GPU/CPU utilisation stats */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getStats: () => get<any>("/api/v1/orchestrator/status"),

    /** GET /jobs — list of jobs (optionally filtered by state) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getJobs: (state?: string) =>
        get<any[]>(
            state
                ? `/api/v1/orchestrator/jobs?state=${encodeURIComponent(state)}`
                : "/api/v1/orchestrator/jobs"
        ),

    /** GET /nodes — cluster node status */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNodes: () => get<any>("/api/v1/orchestrator/nodes"),
};

// ---------------------------------------------------------------------------
// Experiments  (gateway → /api/v1/experiments → experiments service)
// ---------------------------------------------------------------------------
export const ExperimentsAPI = {
    /** GET /experiments — list all experiments */
    list: () => get<unknown[]>("/api/v1/experiments/experiments"),

    /** GET /runs?experiment_id=... — list runs for an experiment */
    listRuns: (experimentId: string) =>
        get<unknown[]>(
            `/api/v1/experiments/runs?experiment_id=${encodeURIComponent(experimentId)}`
        ),
};

// ---------------------------------------------------------------------------
// Datasets  (gateway → /api/v1/datasets → datasets service)
// ---------------------------------------------------------------------------
export const DatasetsAPI = {
    /** GET /datasets — list all datasets */
    list: () => get<unknown[]>("/api/v1/datasets/datasets"),
};

// ---------------------------------------------------------------------------
// Adapters  (gateway → /api/v1/adapters → adapters service)
// ---------------------------------------------------------------------------
export const AdaptersAPI = {
    /** GET /adapters — list all adapters */
    list: (ownerId?: string) =>
        get<unknown[]>(
            ownerId
                ? `/api/v1/adapters/adapters?owner_id=${encodeURIComponent(ownerId)}`
                : "/api/v1/adapters/adapters"
        ),
};

// ---------------------------------------------------------------------------
// Metrics  (gateway → /api/v1/metrics → metrics service)
// ---------------------------------------------------------------------------
export const MetricsAPI = {
    /** GET /recent — recent metric batches */
    getRecent: () => get<unknown[]>("/api/v1/metrics/recent"),

    /** GET /metrics — all metric series */
    getAll: () =>
        get<Record<string, unknown>>("/api/v1/metrics/metrics"),
};

// ---------------------------------------------------------------------------
// Deploy  (gateway → /api/v1/deploy → deploy service)
// ---------------------------------------------------------------------------
export const DeployAPI = {
    /** GET /deployments — list all deployments */
    listDeployments: (env?: string) =>
        get<unknown[]>(
            env
                ? `/api/v1/deploy/deployments?env=${encodeURIComponent(env)}`
                : "/api/v1/deploy/deployments"
        ),
};

// ---------------------------------------------------------------------------
// Marketplace  (gateway → /api/v1/marketplace → marketplace service)
// ---------------------------------------------------------------------------
export const MarketplaceAPI = {
    /** GET /trending — trending adapters/skills */
    getTrending: (limit = 12) =>
        get<unknown[]>(`/api/v1/marketplace/trending?limit=${limit}`),

    /** GET /search?q=... — search adapters */
    search: (query: string, task?: string) =>
        get<unknown[]>(
            task
                ? `/api/v1/marketplace/search?q=${encodeURIComponent(query)}&task=${encodeURIComponent(task)}`
                : `/api/v1/marketplace/search?q=${encodeURIComponent(query)}`
        ),
};

// ---------------------------------------------------------------------------
// University  (gateway → /api/v1/university → university service)
// ---------------------------------------------------------------------------
export const UniversityAPI = {
    /** GET /courses — list all courses */
    getCourses: () => get<unknown[]>("/api/v1/university/courses"),

    /** GET /courses/{id} — get a single course */
    getCourse: (id: string) =>
        get<Record<string, unknown>>(
            `/api/v1/university/courses/${encodeURIComponent(id)}`
        ),
};
