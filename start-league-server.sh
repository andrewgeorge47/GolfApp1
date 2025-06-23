#!/bin/bash

echo "Starting Golf League Server..."
echo "Make sure you have Node.js installed and dependencies installed."

# Check if node_modules exists in server directory
if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

# Start the server
echo "Starting server on http://localhost:3001"
cd server
node golf-league-server.js 