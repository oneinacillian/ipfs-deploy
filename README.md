# IPFS Deploy

A containerized IPFS node with additional features for content management and monitoring.

## Key Components (Docker Compose)
* IPFS Node
* Prometheus (Metrics)
* Grafana (Monitoring Dashboard)

## Environment Variables

**IPFS**
* `IPFS_GW_REMOTE_PORT`: IPFS Gateway port (HTTP access to IPFS content)
* `IPFS_API_REMOTE_PORT`: IPFS API port (programmatic node management)
* `IPFS_SWARM_REMOTE_PORT`: IPFS P2P communication port
* `IPFS_FRONTEND_REMOTE_PORT`: Frontend service port

**Grafana**
* `GF_USERNAME`: Initial admin username
* `GF_PASSWORD`: Initial admin password

## Custom IPFS Settings

### Network Security
* **Private Network Filtering**
  ```bash
  /ip4/10.0.0.0/ipcidr/8
  /ip4/172.16.0.0/ipcidr/12
  /ip4/192.168.0.0/ipcidr/16
  ```
  Prevents connections to private IP ranges, enhancing security by limiting peer connections to public networks only.

### API Access
* **CORS Configuration**
  - Origins: Allows requests from any origin (`*`)
  - Methods: Enables GET and POST requests
  - Purpose: Facilitates web application integration and API accessibility

### External Access
* **API Endpoint**: Bound to all interfaces (`0.0.0.0:5001`)
* **Purpose**: 
  - Enables external service connections
  - Allows Prometheus metrics collection
  - Facilitates container-to-container communication

## System Requirements
```bash
# Required UDP buffer sizes
sysctl -w net.core.rmem_max=7500000
sysctl -w net.core.wmem_max=7500000
```

## API Endpoints

### Content Management
* `POST /pin`
  - Pins content to the local node
  - Body: `{ "hash": "IPFS_HASH" }`

* `GET /ipfs/:hash`
  - Retrieves content from IPFS network
  - Params: IPFS hash in URL

### Content Processing
* `POST /resize/:hash`
  - Resizes images stored on IPFS
  - Params: 
    - `width` and `height`: Required dimensions in pixels
    - `format`: Output format (webp, avif, jpeg, png) - default: webp
    - `quality`: Compression quality (1-100) - default: 80
  - Example: `/resize/QmHash?width=200&height=200&format=avif&quality=90`

* `POST /resize-video/:hash`
  - Resizes videos stored on IPFS
  - Params: 
    - `width` and `height`: Required dimensions in pixels
    - `format`: Output format (mp4, webm) - default: mp4
    - `crf`: Compression quality (0-51, lower is better) - default: 23
    - `preset`: Encoding speed/quality preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow) - default: medium
  - Example: `/resize-video/QmHash?width=640&height=360&format=webm&crf=18&preset=slow`

### Network Management
* `GET /replication-status/:hash`
  - Shows content replication status
  - Provides peer count, gateway availability, and network details

* `POST /replicate/:hash`
  - Actively manages content replication
  - Optional params: `targetCount`, `maxAttempts`, `checkInterval`
  - Ensures content availability across the network

### System Monitoring
* `GET /health`
  - Provides system health information
  - Returns IPFS node status, version, peer count, and uptime
  - Example: `/health`

## Monitoring
Grafana dashboards are available at `http://localhost:3000` with pre-configured IPFS metrics:
* Network performance
* Bandwidth usage
* Peer connections
* Storage metrics

Dashboard configurations are stored in `grafana/provisioning/dashboards/`.

## Quick Start
```bash
docker-compose up -d --build
```

## Recent Improvements

### Enhanced Image Processing
| Feature | Details | Benefits |
|---------|---------|----------|
| Multiple Image Formats | Support for WebP, AVIF, JPEG, and PNG | Better compression options and browser compatibility |
| Quality Control | Adjustable compression quality (1-100) | Balance between file size and visual quality |
| Caching System | 24-hour cache for processed images | Faster response times and reduced processing load |

### Advanced Video Processing
| Feature | Details | Benefits |
|---------|---------|----------|
| Multiple Video Formats | Support for MP4 and WebM | Better compatibility with different platforms |
| Quality Control | Adjustable CRF values (0-51) | Fine-grained control over compression quality |
| Encoding Presets | Options from ultrafast to veryslow | Balance between encoding speed and quality |
| Streaming Optimization | Web-optimized output with faststart | Better playback experience in browsers |

### System Improvements
| Feature | Details | Benefits |
|---------|---------|----------|
| Health Monitoring | New `/health` endpoint | Easy system status verification |
| Improved Error Handling | Better timeout management and error reporting | More reliable operation |
| Content Availability Checks | Enhanced content verification before processing | Prevents processing failures |
| Caching System | Automatic caching of processed assets | Improved performance and reduced load |
| Updated to Kubo v0.27.0 | Latest IPFS node implementation | Improved routing, better DHT performance, enhanced stability |
| Node.js 20.x LTS | Updated runtime environment | Better performance, improved security, latest ECMAScript features |
| Locked NPM Dependencies | Specific versions for node-fetch, express, sharp, and fluent-ffmpeg | Ensures consistent builds and prevents dependency conflicts |
| Enhanced Provider Discovery | Updated routing/findprovs implementation | More reliable content discovery and replication tracking |

### Purpose
The IPFS Deploy stack provides a robust, containerized IPFS node with enhanced content management capabilities. Recent updates focus on:

* **Improved Reliability**: Using Kubo v0.27.0's enhanced routing system for better content discovery and distribution
* **Enhanced Performance**: Node.js 20.x LTS provides significant performance improvements and better memory management
* **Build Consistency**: Locked NPM dependencies ensure reproducible builds across different environments
* **Better Debugging**: Enhanced logging and error handling make system maintenance and troubleshooting more efficient
* **Future-Proof**: Latest stable versions of all components ensure longer-term support and security updates

## Monitoring Dashboard

### Overview
![IPFS Dashboard Overview](./images/dashboard-overview.png)

The Grafana dashboard provides real-time monitoring of:
* Network Performance Metrics
* Bandwidth Usage Statistics
* Peer Connection Status
* Storage Utilization

### Key Metrics
![IPFS Metrics Detail](./images/metrics-detail.png)

Monitor critical IPFS node metrics:
* Content Addition/Retrieval Rates
* Peer Count and Geographic Distribution
* Bandwidth Usage Patterns
* Storage Growth Trends


## Usage Example

### 1. Adding Content to IPFS
```bash
# Add an image to IPFS
ipfs add screenshot_2024-11-26.png
```
> added QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD screenshot_2024-11-26.png

This command adds your file to IPFS and returns a unique content identifier (CID).

### 2. Pinning Content
```bash
# Pin the content to ensure persistence
curl -X POST -H "Content-Type: application/json" \
     -d '{"hash":"QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD"}' \
     http://localhost:30000/pin
```
Pinning prevents the content from being garbage collected and ensures availability.

### 3. Check Replication Status
```bash
# Get detailed replication information
curl "http://localhost:30000/replication-status/QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD"
```
Sample response:
```json
{
  "replicationCount": 336,
  "sufficient": true,
  "overReplicated": true,
  "minRequired": 3,
  "maxDesired": 10,
  "gatewayAvailable": true
}
```
This shows the content is well-replicated across the network and accessible via public gateways.

### 4. Resize Image with Advanced Options
```bash
# Resize the image to 200x200 pixels with AVIF format and high quality
curl -X POST "http://localhost:30000/resize/QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD?width=200&height=200&format=avif&quality=90" \
     --output resized-image.avif
```
Creates a resized version of the image in AVIF format with 90% quality, providing excellent compression while maintaining visual fidelity.

### 5. Process Video with Custom Settings
```bash
# Resize video to 720p with high quality and WebM format
curl -X POST "http://localhost:30000/resize-video/QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD?width=1280&height=720&format=webm&crf=18&preset=slow" \
     --output processed-video.webm
```
Converts the video to 720p resolution in WebM format with high quality (CRF 18) using the "slow" preset for better compression efficiency.

### 6. Check System Health
```bash
# Get system health information
curl "http://localhost:30000/health"
```
Sample response:
```json
{
  "status": "healthy",
  "ipfs": {
    "version": "0.27.0",
    "commit": "v0.27.0-rc1/go1.21.3"
  },
  "network": {
    "peers": 42
  },
  "uptime": 86400.32
}
```
Provides a quick overview of system health, IPFS version, connected peers, and uptime in seconds.

### 7. Verify Public Accessibility
```bash
# Check if content is available on public IPFS gateway
curl -I "https://ipfs.io/ipfs/QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD"
```

**Key Response Indicators:**
- ✅ `200` status: Content successfully retrieved
- 📦 `4.1MB` file size
- 🔒 `immutable` cache control: Content is permanent
- 🌍 `rainbow-fr2-03`: Served from French IPFS gateway
- 🔄 `MISS` cache status: Fresh content retrieval

This workflow demonstrates:
- Content addition and pinning
- Replication monitoring
- Advanced image and video processing capabilities
- System health monitoring
- Public accessibility verification

<details>
<summary>📋 Raw Response Headers (Reference)</summary>

```http
HTTP/2 200 
date: Fri, 10 Jan 2025 11:03:21 GMT
content-type: image/png
content-length: 4121032
access-control-allow-headers: Content-Type
access-control-allow-headers: Range
access-control-allow-headers: User-Agent
access-control-allow-headers: X-Requested-With
access-control-allow-methods: GET
access-control-allow-methods: HEAD
access-control-allow-methods: OPTIONS
access-control-allow-origin: *
access-control-expose-headers: Content-Length
access-control-expose-headers: Content-Range
access-control-expose-headers: X-Chunked-Output
access-control-expose-headers: X-Ipfs-Path
access-control-expose-headers: X-Ipfs-Roots
access-control-expose-headers: X-Stream-Output
cache-control: public, max-age=29030400, immutable
etag: "QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD"
x-ipfs-path: /ipfs/QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD
x-ipfs-roots: QmRKzqRi9c1HHmPxKXnUTKnyhnCAm6wxrUy6eHyMxwUuoD
x-ipfs-pop: rainbow-fr2-03
cf-cache-status: MISS
accept-ranges: bytes
server: cloudflare
cf-ray: 8ffc2e156b9739c4-FRA
alt-svc: h3=":443"; ma=86400
```
</details>