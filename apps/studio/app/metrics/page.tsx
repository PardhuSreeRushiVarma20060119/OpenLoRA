export default function MetricsPage() {
    return (
        <div className="p-8 space-y-4">
            <h1 className="text-3xl font-bold text-white">Metrics</h1>
            <p className="text-gray-400">System-wide telemetry and performance monitoring.</p>
            <div className="p-4 border border-dashed border-gray-700 rounded-lg bg-white/5">
                <p className="text-sm text-gray-500">Prometheus/Grafana integration view coming soon.</p>
            </div>
        </div>
    );
}
