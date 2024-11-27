import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

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

// Endpoint for resizing images from IPFS
app.post('/resize/:hash', async (req, res) => {
    const hash = req.params.hash; // IPFS CID
    const width = parseInt(req.query.width, 10); // Desired width from query param
    const height = parseInt(req.query.height, 10); // Desired height from query param

    if (!hash) {
        return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
    }

    if (!width || !height) {
        return res.status(400).send({ success: false, message: 'Width and height parameters are required' });
    }

    const ipfsUrl = `http://localhost:5001/api/v0/cat?arg=${hash}`;
    console.log(`Fetching IPFS content for resizing from: ${ipfsUrl}`);

    try {
        // Fetch the image from IPFS using POST
        const response = await fetch(ipfsUrl, {
            method: 'POST' // Reverted to POST
        });

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        // Process the image with sharp
        const buffer = await response.buffer();
        const resizedImage = await sharp(buffer)
            .resize(width, height)
            .toBuffer();

        // Send the resized image back to the client
        res.set('Content-Type', 'image/png'); // Set the appropriate content type
        res.send(resizedImage);
    } catch (error) {
        console.error('Error resizing image:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

// Endpoint for resizing videos from IPFS
app.post('/resize-video/:hash', async (req, res) => {
    const hash = req.params.hash; // IPFS CID
    const width = req.query.width; // Desired width
    const height = req.query.height; // Desired height

    if (!hash || !width || !height) {
        return res.status(400).send({ success: false, message: 'CID, width, and height are required' });
    }

    const ipfsUrl = `http://localhost:5001/api/v0/cat?arg=${hash}`;
    console.log(`Fetching video from IPFS: ${ipfsUrl}`);

    try {
        // Fetch the video from IPFS using POST
        const response = await fetch(ipfsUrl, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`IPFS error: ${response.statusText}`);
        }

        // Create a temporary input file
        const inputFile = path.join(__dirname, 'temp-input.mp4'); // Fixed __dirname
        const outputFile = path.join(__dirname, 'temp-output.mp4'); // Fixed __dirname
        const writeStream = fs.createWriteStream(inputFile);

        // Pipe IPFS response to the input file
        response.body.pipe(writeStream);

        // Wait for the file to finish writing
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Resize the video using FFmpeg
        ffmpeg(inputFile)
            .size(`${width}x${height}`)
            .output(outputFile)
            .on('end', () => {
                console.log('Video resizing completed!');
                res.sendFile(outputFile); // Send the resized video to the client
            })
            .on('error', (err) => {
                console.error('Error resizing video:', err.message);
                res.status(500).send({ success: false, message: err.message });
            })
            .run();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
