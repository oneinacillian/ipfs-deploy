# IPFS Deploy

>IPFS protocol serves for hosting data and transporting it peer-to-peer without relying on centralized servers

- The protocol offers a new way of addressing content consumed over the Internet by making files findable based on the actual contents rather than their location
- Decentralized storage tools are becoming more significant over time seeing the rising interest in non-fungible tokens and a way to store them securely
- Devs benefit from IPFS by hosting dApp data in decentralized repositories instead of a rather costly alternative of keeping it on the blockchain

**Prepare host UDP Buffer Sizes**

```
sysctl -w net.core.rmem_max=7500000
sysctl -w net.core.wmem_max=7500000
```

### Docker Compose
> The following components will be deployed using docker compose

* IPFS
* Prometheus
* Grafana

> IPFS (env)

-  `IPFS_GW_REMOTE_PORT`: Host port for IPFS Gateway, for accessing IPFS content over HTTP.
-  `IPFS_API_REMOTE_PORT`: Host port for IPFS API, for managing the IPFS node programmatically.
-  `IPFS_SWARM_REMOTE_PORT`: Host port for IPFS peering and P2P communication.
-  `IPFS_FRONTEND_REMOTE_PORT`: Host port for exposing service via frontend.

> GRAFANA (env)

-  `GF_USERNAME`: Initial Grafana Username
-  `GF_PASSWORD`: Initial Grafana Password

> IPFS config settings

- `jq '.Swarm.AddrFilters += ["/ip4/10.0.0.0/ipcidr/8", "/ip4/172.16.0.0/ipcidr/12", "/ip4/192.168.0.0/ipcidr/16"]'`: Prevent the node from connecting to peers in private network ranges
- `jq '.API.HTTPHeaders += {"Access-Control-Allow-Origin": ["*"], "Access-Control-Allow-Methods": ["GET", "POST"]}'`: Allows requests from any origin to access the API (CORS setting) and allow GET and POST methods for API access
- `jq '.Addresses.API = "/ip4/0.0.0.0/tcp/5001"'`: Makes the IPFS API externally accessible by binding it to all network interfaces. Requirement for Prometheus scrape metric data

