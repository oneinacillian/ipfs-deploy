// import express from 'express';
// import fetch from 'node-fetch';
// const app = express();
// const PORT = 3000;

// app.use(express.json());

// app.post('/pin', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to pin
//     const response = await fetch(`http://localhost:5001/api/v0/pin/add?arg=${hash}`);
//     const data = await response.json();
//     if (data.Pins) {
//         // Store pin info in database
//         res.send({ success: true, message: 'Content pinned', data: data });
//     } else {
//         res.send({ success: false, message: 'Failed to pin content' });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// const express = require('express');
// const fetch = require('node-fetch');
// const app = express();
// const PORT = 3000;

// app.use(express.json());

// app.post('/pin', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to pin
//     try {
//         const response = await fetch(`http://localhost:5001/api/v0/pin/add?arg=${hash}`);
//         if (!response.ok) {
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }
//         const data = await response.json();
//         if (data.Pins) {
//             // Store pin info in database
//             res.send({ success: true, message: 'Content pinned', data: data });
//         } else {
//             res.send({ success: false, message: 'Failed to pin content', data: data });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// import express from 'express';
// import fetch from 'node-fetch';

// const app = express();
// const PORT = 3000;

// app.use(express.json());

// app.post('/pin', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to pin
//     const url = `http://localhost:5001/api/v0/pin/add?arg=${hash}`;
    
//     try {
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' }
//         });

//         // Check if the response from IPFS was not OK (i.e., not in the 200 range)
//         if (!response.ok) {
//             const errorBody = await response.text(); // Get the full error response
//             console.error('Error response from IPFS:', errorBody);
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }

//         const data = await response.json();

//         if (data.Pins) {
//             // Store pin info in database (omitted for brevity)
//             res.send({ success: true, message: 'Content pinned', data: data });
//         } else {
//             res.send({ success: false, message: 'Failed to pin content', data: data });
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// import express from 'express';
// import fetch from 'node-fetch';

// const app = express();
// const PORT = 3000;

// app.use(express.json());

// // Endpoint for pinning content to IPFS
// app.post('/pin', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to pin
//     const url = `http://localhost:5001/api/v0/pin/add?arg=${hash}`;

//     try {
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' }
//         });

//         if (!response.ok) {
//             const errorBody = await response.text();
//             console.error('Error response from IPFS:', errorBody);
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }

//         const data = await response.json();
//         if (data.Pins) {
//             res.send({ success: true, message: 'Content pinned', data: data });
//         } else {
//             res.send({ success: false, message: 'Failed to pin content', data: data });
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// // Endpoint for fetching content from IPFS
// app.get('/ipfs/:hash', async (req, res) => {
//     const hash = req.params.hash; // IPFS hash to fetch

//     if (!hash) {
//         return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
//     }

//     const url = `http://localhost:5001/api/v0/cat?arg=${hash}`;

//     try {
//         const response = await fetch(url);

//         if (!response.ok) {
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }

//         const data = await response.text(); // Assuming the content is text-based; adjust if it's binary
//         res.send({ success: true, message: 'Content fetched', data: data });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

// import express from 'express';
// import fetch from 'node-fetch';

// const app = express();
// const PORT = 3000;

// app.use(express.json());

// // Endpoint for pinning content to IPFS
// app.post('/pin', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to pin
//     const url = `http://localhost:5001/api/v0/pin/add?arg=${hash}`;

//     try {
//         const response = await fetch(url, {
//             method: 'POST'
//         });

//         if (!response.ok) {
//             const errorBody = await response.text();
//             console.error('Error response from IPFS:', errorBody);
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }

//         const data = await response.json();
//         if (data.Pins) {
//             res.send({ success: true, message: 'Content pinned', data: data });
//         } else {
//             res.send({ success: false, message: 'Failed to pin content', data: data });
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// // Endpoint for fetching content from IPFS
// app.post('/fetch', async (req, res) => {
//     const hash = req.body.hash; // IPFS hash to fetch

//     if (!hash) {
//         return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
//     }

//     const url = `http://localhost:5001/api/v0/cat?arg=${hash}`;

//     try {
//         const response = await fetch(url, {
//             method: 'POST'
//         });

//         if (!response.ok) {
//             throw new Error(`IPFS error: ${response.statusText}`);
//         }

//         const data = await response.text();
//         res.send({ success: true, message: 'Content fetched', data: data });
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).send({ success: false, message: error.message });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });

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
        return res.status(400).send({ success: false, message: 'No IPFS hash provided' });
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

        const data = await response.text();
        res.send({ success: true, message: 'Content fetched', data: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
