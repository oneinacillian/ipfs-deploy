import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// Add new constants for replication settings
const MIN_REPLICATION_COUNT = 3; // Minimum desired replicas
const REPLICATION_CHECK_TIMEOUT = 5000; // Timeout for replication checks in ms
const MAX_REPLICATION_COUNT = 10; // Example maximum desired replicas

// Add cache directory
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
}

// Helper function to generate cache key
function generateCacheKey(hash, params) {
    const paramsStr = JSON.stringify(params);
    return crypto.createHash('md5').update(`${hash}-${paramsStr}`).digest('hex');
}

// Add cache middleware
function cacheMiddleware(req, res, next) {
    const hash = req.params.hash;
    const params = { ...req.query };
    const cacheKey = generateCacheKey(hash, params);
    const cachePath = path.join(CACHE_DIR, cacheKey);
    
    // Check if cached version exists
    if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const fileAge = Date.now() - stats.mtimeMs;
        
        // Cache valid for 24 hours
        if (fileAge < 24 * 60 * 60 * 1000) {
            console.log(`Serving cached version for ${hash}`);
            return res.sendFile(cachePath);
        }
    }
    
    // Store cache path for later use
    req.cachePath = cachePath;
    next();
}

// Add timeout wrapper for fetch requests
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}

// Endpoint for pinning content to IPFS
app.post('/pin', async (req, res) => {
    const hash = req.body.hash; // IPFS hash to pin
    const url = `http://localhost:5001/api/v0/pin/add?arg=${hash}`;
    console.log(`Sending request to IPFS to pin: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST'
        });

        console.log(`Response from IPFS: Status ${response.status}`);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error response from IPFS:', errorBody);
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.Pins) {
            res.send({ success: true, message: 'Content pinned', data: data });
        } else {
            res.send({ success: false, message: 'Failed to pin content', data: data });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Endpoint for fetching content from the local IPFS node
app.get('/ipfs/:hash', async (req, res) => {
    const hash = req.params.hash; // IPFS hash from the URL path

    if (!hash) {
        return res.status(400).send('No IPFS hash provided');
    }

    const ipfsUrl = `http://localhost:5001/api/v0/cat?arg=${hash}`;
    console.log(`Fetching IPFS content from: ${ipfsUrl}`);

    try {
        const response = await fetch(ipfsUrl, {
            method: 'POST'
        });

        console.log(`Response from IPFS: Status ${response.status}`);

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        // Stream the response directly back to the client
        response.body.pipe(res);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Update the content availability check
async function ensureContentAvailable(hash, timeout = 30000) {
    // First try to cat a small portion of the content
    try {
        const testUrl = `http://localhost:5001/api/v0/cat?arg=${hash}&offset=0&length=1`;
        const testResponse = await fetchWithTimeout(testUrl, { method: 'POST' }, timeout);
        if (testResponse.ok) {
            console.log('Content is already accessible');
            return true;
        }
    } catch (error) {
        console.log('Content not immediately accessible:', error.message);
    }

    // Check if content is pinned locally
    try {
        const pinCheckUrl = `http://localhost:5001/api/v0/pin/ls?arg=${hash}`;
        const pinResponse = await fetchWithTimeout(pinCheckUrl, { method: 'POST' }, timeout);
        const pinData = await pinResponse.json();
        if (pinResponse.ok && pinData.Keys && pinData.Keys[hash]) {
            console.log('Content is pinned locally');
            return true;
        }
    } catch (error) {
        console.log('Content not pinned locally:', error.message);
    }

    // Try to find providers
    try {
        const providersUrl = `http://localhost:5001/api/v0/dht/findprovs?arg=${hash}&num-providers=1`;
        const providersResponse = await fetchWithTimeout(providersUrl, { method: 'POST' }, timeout);
        if (!providersResponse.ok) {
            console.log('No providers found for content');
            return false;
        }
    } catch (error) {
        console.log('Error finding providers:', error.message);
        return false;
    }

    return false;
}

// Update the resize endpoint to handle content availability
app.post('/resize/:hash', cacheMiddleware, async (req, res) => {
    const hash = req.params.hash;
    const width = parseInt(req.query.width, 10);
    const height = parseInt(req.query.height, 10);
    const format = req.query.format || 'webp'; // Add format option (webp, avif, jpeg, png)
    const quality = parseInt(req.query.quality, 10) || 80; // Add quality parameter

    if (!hash) {
        return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
    }

    if (!width || !height) {
        return res.status(400).send({ success: false, message: 'Width and height parameters are required' });
    }

    try {
        // First ensure we can access the content
        const isAvailable = await ensureContentAvailable(hash);
        if (!isAvailable) {
            return res.status(404).send({ 
                success: false, 
                message: 'Content not available. Unable to fetch from IPFS network.' 
            });
        }

        // Now proceed with resizing
        const ipfsUrl = `http://localhost:5001/api/v0/cat?arg=${hash}`;
        const response = await fetch(ipfsUrl, { method: 'POST' });

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        // Process the image with sharp with enhanced options
        const buffer = await response.buffer();
        let resizedImage = sharp(buffer).resize(width, height);
        
        // Apply format and quality
        switch(format) {
            case 'webp':
                resizedImage = resizedImage.webp({ quality });
                res.set('Content-Type', 'image/webp');
                break;
            case 'avif':
                resizedImage = resizedImage.avif({ quality });
                res.set('Content-Type', 'image/avif');
                break;
            case 'jpeg':
            case 'jpg':
                resizedImage = resizedImage.jpeg({ quality });
                res.set('Content-Type', 'image/jpeg');
                break;
            case 'png':
                resizedImage = resizedImage.png({ quality });
                res.set('Content-Type', 'image/png');
                break;
            default:
                resizedImage = resizedImage.webp({ quality });
                res.set('Content-Type', 'image/webp');
        }
        
        const outputBuffer = await resizedImage.toBuffer();
        
        // Save to cache if caching is enabled
        if (req.cachePath) {
            fs.writeFileSync(req.cachePath, outputBuffer);
        }
        
        res.send(outputBuffer);
    } catch (error) {
        console.error('Error resizing image:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Update video resize endpoint with better error handling
app.post('/resize-video/:hash', async (req, res) => {
    const hash = req.params.hash;
    const width = req.query.width;
    const height = req.query.height;
    const format = req.query.format || 'mp4'; // Add format option
    const crf = parseInt(req.query.crf, 10) || 23; // Compression quality (lower is better)
    const preset = req.query.preset || 'medium'; // Encoding preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)

    if (!hash || !width || !height) {
        return res.status(400).send({ success: false, message: 'CID, width, and height are required' });
    }

    try {
        // Check content availability with 30-second timeout
        const isAvailable = await ensureContentAvailable(hash, 30000);
        if (!isAvailable) {
            return res.status(404).send({ 
                success: false, 
                message: 'Content not available in IPFS network or timed out' 
            });
        }

        const ipfsUrl = `http://localhost:5001/api/v0/cat?arg=${hash}`;
        const response = await fetchWithTimeout(ipfsUrl, { method: 'POST' }, 60000); // 60-second timeout for full content

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        // Create temporary files with unique names to avoid conflicts
        const uniqueId = Date.now();
        const inputFile = path.join(__dirname, `temp-input-${uniqueId}.mp4`);
        const outputFile = path.join(__dirname, `temp-output-${uniqueId}.${format}`);
        const writeStream = fs.createWriteStream(inputFile);

        response.body.pipe(writeStream);

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Process with FFmpeg with enhanced options
        await new Promise((resolve, reject) => {
            let ffmpegCommand = ffmpeg(inputFile)
                .size(`${width}x${height}`)
                .videoCodec('libx264')
                .outputOptions([
                    `-crf ${crf}`,
                    `-preset ${preset}`,
                    '-movflags faststart' // Optimize for web streaming
                ]);
                
            // Set format-specific options
            if (format === 'webm') {
                ffmpegCommand = ffmpegCommand
                    .videoCodec('libvpx-vp9')
                    .outputOptions([
                        '-b:v 0',
                        `-crf ${crf}`,
                        '-deadline good'
                    ]);
            }
            
            ffmpegCommand.output(outputFile)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Set appropriate content type
        const contentTypes = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska'
        };
        res.set('Content-Type', contentTypes[format] || 'video/mp4');

        // Send the result and clean up
        res.sendFile(outputFile, () => {
            // Clean up temporary files after sending
            fs.unlink(inputFile, () => {});
            fs.unlink(outputFile, () => {});
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Add new endpoint for checking replication status with swarm peer information
app.get('/replication-status/:hash', async (req, res) => {
    const hash = req.params.hash;
    
    if (!hash) {
        return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
    }

    try {
        // First check if the file exists and is pinned locally
        const pinCheckUrl = `http://localhost:5001/api/v0/pin/ls?arg=${hash}`;
        const pinResponse = await fetch(pinCheckUrl, { method: 'POST' });
        const pinData = await pinResponse.json();
        
        console.log('Pin check response:', pinData);

        if (!pinResponse.ok) {
            return res.status(404).send({ 
                success: false, 
                message: 'File not found or not pinned locally' 
            });
        }

        // Get swarm peers information
        const swarmPeersUrl = 'http://localhost:5001/api/v0/swarm/peers';
        const swarmResponse = await fetch(swarmPeersUrl, { method: 'POST' });
        const swarmData = await swarmResponse.json();
        console.log('Swarm peers response:', swarmData);
        
        const connectedPeers = swarmData.Peers || [];

        // Use the updated routing command format for Kubo v0.27
        const providersUrl = `http://localhost:5001/api/v0/routing/findprovs?arg=${hash}&num-providers=100`;
        const providersResponse = await fetch(providersUrl, { method: 'POST' });
        
        if (!providersResponse.ok) {
            throw new Error(`Failed to fetch providers information: ${providersResponse.statusText}`);
        }

        // Read the response as text first
        const responseText = await providersResponse.text();
        console.log('Raw providers response:', responseText);

        const providers = new Set();
        const providerDetails = new Map();

        // Try to parse the response
        try {
            // Split the response by newlines and process each line
            const lines = responseText.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    console.log('Processing provider entry:', entry);

                    // Handle different response formats
                    if (entry.Peer) {
                        // New format
                        providers.add(entry.Peer);
                        providerDetails.set(entry.Peer, {
                            id: entry.Peer,
                            addresses: entry.Addrs || [],
                            isConnected: connectedPeers.some(p => p.Peer === entry.Peer)
                        });
                    } else if (entry.ID) {
                        // Alternative format
                        providers.add(entry.ID);
                        providerDetails.set(entry.ID, {
                            id: entry.ID,
                            addresses: entry.Addrs || [],
                            isConnected: connectedPeers.some(p => p.Peer === entry.ID)
                        });
                    }
                } catch (parseError) {
                    console.warn('Failed to parse provider line:', parseError.message);
                }
            }
        } catch (parseError) {
            console.error('Error parsing providers response:', parseError);
        }

        // Check if content is available on IPFS Gateway
        const gatewayUrl = `https://ipfs.io/ipfs/${hash}`;
        let gatewayAvailable = false;
        try {
            const gatewayResponse = await fetch(gatewayUrl, { method: 'HEAD' });
            gatewayAvailable = gatewayResponse.ok;
        } catch (error) {
            console.warn('Gateway check failed:', error.message);
        }

        const replicationCount = providers.size;
        const sufficient = replicationCount >= MIN_REPLICATION_COUNT;
        const overReplicated = replicationCount > MAX_REPLICATION_COUNT;

        const response = {
            success: true,
            hash,
            replicationStatus: {
                replicationCount,
                sufficient,
                overReplicated,
                minRequired: MIN_REPLICATION_COUNT,
                maxDesired: MAX_REPLICATION_COUNT,
                gatewayAvailable
            },
            networkStatus: {
                connectedPeers: connectedPeers.length,
                totalProviders: providers.size
            },
            providers: Array.from(providerDetails.values()),
            debug: {
                rawResponse: responseText // Include raw response for debugging
            }
        };

        console.log('Final response:', response);
        res.send(response);

    } catch (error) {
        console.error('Error checking replication:', error);
        res.status(500).send({
            success: false,
            message: error.message,
            hash,
            stack: error.stack
        });
    }
});

// Update the replicate endpoint to include better control and verification
app.post('/replicate/:hash', async (req, res) => {
    const hash = req.params.hash;
    const targetCount = parseInt(req.query.targetCount) || MIN_REPLICATION_COUNT;
    const maxAttempts = parseInt(req.query.maxAttempts) || 10;
    const checkInterval = parseInt(req.query.checkInterval) || 2000; // ms

    if (!hash) {
        return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
    }

    try {
        // Initial replication check
        const initialStatus = await checkReplicationCount(hash);
        
        if (initialStatus >= targetCount) {
            return res.send({
                success: true,
                message: 'Content already has desired replication count',
                currentCount: initialStatus,
                targetCount
            });
        }

        // Pin the content locally if not already pinned
        const pinUrl = `http://localhost:5001/api/v0/pin/add?arg=${hash}`;
        await fetch(pinUrl, { method: 'POST' });

        // Announce to DHT
        const announceUrl = `http://localhost:5001/api/v0/dht/provide?arg=${hash}`;
        await fetch(announceUrl, { method: 'POST' });

        // Monitor replication progress
        let attempts = 0;
        let finalCount = initialStatus;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            finalCount = await checkReplicationCount(hash);
            
            if (finalCount >= targetCount) {
                return res.send({
                    success: true,
                    message: 'Target replication count achieved',
                    initialCount: initialStatus,
                    finalCount,
                    targetCount,
                    attempts: attempts + 1
                });
            }
            attempts++;
        }

        res.send({
            success: false,
            message: 'Could not achieve target replication count within timeout',
            initialCount: initialStatus,
            currentCount: finalCount,
            targetCount,
            attempts
        });

    } catch (error) {
        console.error('Error in replication:', error);
        res.status(500).send({
            success: false,
            message: error.message,
            hash
        });
    }
});

// Helper function to check replication count
async function checkReplicationCount(hash) {
    const providersUrl = `http://localhost:5001/api/v0/dht/findprovs?arg=${hash}`;
    const providersResponse = await fetch(providersUrl, { method: 'POST' });
    const responseText = await providersResponse.text();
    const providers = new Set();
    
    responseText.split('\n')
        .filter(line => line.trim())
        .forEach(line => {
            try {
                const response = JSON.parse(line);
                if (response.Responses) {
                    response.Responses.forEach(peer => {
                        providers.add(peer.ID);
                    });
                }
            } catch (e) {
                console.error('Error parsing provider response:', e);
            }
        });

    return providers.size;
}

// Add health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check IPFS node status
        const versionUrl = 'http://localhost:5001/api/v0/version';
        const versionResponse = await fetchWithTimeout(versionUrl, { method: 'POST' }, 5000);
        
        if (!versionResponse.ok) {
            throw new Error('IPFS node not responding');
        }
        
        const versionData = await versionResponse.json();
        
        // Check swarm peers
        const peersUrl = 'http://localhost:5001/api/v0/swarm/peers';
        const peersResponse = await fetchWithTimeout(peersUrl, { method: 'POST' }, 5000);
        const peersData = await peersResponse.json();
        const peerCount = (peersData.Peers || []).length;
        
        res.send({
            status: 'healthy',
            ipfs: {
                version: versionData.Version,
                commit: versionData.Commit
            },
            network: {
                peers: peerCount
            },
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).send({
            status: 'unhealthy',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
