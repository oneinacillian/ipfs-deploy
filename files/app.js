import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

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
            method: 'POST' // Using POST as per your specification
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
