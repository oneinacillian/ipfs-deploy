#!/bin/bash
# Start the IPFS daemon
ipfs daemon &

# Start the Node.js application
node app.js
