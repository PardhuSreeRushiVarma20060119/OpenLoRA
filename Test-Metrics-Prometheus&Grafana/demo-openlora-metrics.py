from prometheus_client import start_http_server, Gauge, Counter
import time, math, random

# Gauges (current values)
training_loss = Gauge('openlora_training_loss', 'Current LoRA training loss')
gpu_util = Gauge('openlora_gpu_utilization', 'Simulated GPU utilization %')
vram_usage = Gauge('openlora_vram_usage_mb', 'Simulated VRAM usage in MB')
gradient_norm = Gauge('openlora_gradient_norm', 'Simulated gradient norm value')

# Counters (accumulating)
epochs = Counter('openlora_epoch_count', 'Number of training epochs completed')
batches = Counter('openlora_batch_count', 'Number of batches processed')

# Internal state
start_time = time.time()
loss_baseline = 1.5

def simulate_metrics():
    epoch = 0
    while True:
        elapsed = time.time() - start_time

        # Loss decays with noise
        current_loss = loss_baseline * math.exp(-0.03 * epoch) + random.uniform(-0.05, 0.05)
        training_loss.set(round(max(current_loss, 0.01), 4))

        # GPU and VRAM fluctuate
        gpu_util.set(random.uniform(45, 97))
        vram_usage.set(random.uniform(5000, 7800))  # In MB

        # Gradient norm fluctuates (spikes can simulate anomalies later)
        grad_norm = random.uniform(0.5, 2.5) + (random.random() * 2 if epoch % 5 == 0 else 0)
        gradient_norm.set(round(grad_norm, 3))

        # Update counters
        batches.inc()
        if int(elapsed) % 20 == 0:  # simulate epoch jump every 20s
            epoch += 1
            epochs.inc()

        time.sleep(2)

if __name__ == '__main__':
    print("Starting OpenLoRA metrics server on http://localhost:8000/")
    start_http_server(8000)
    simulate_metrics()
