const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const http = require('http');
const path = require('path');

const app = express();
const port = 3000;
const IPv4_HOST = '0.0.0.0';

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let mqttCredentials = {};
let client;

app.post('/set-mqtt-credentials', (req, res) => {
    mqttCredentials = req.body;

    // Disconnect from previous MQTT connection if it exists
    if (client && client.connected) {
        client.end();
    }

    // Connect to MQTT with new credentials
    const mqttBrokerOptions = {
        hostname: '172.31.11.33',
        port: 1883,
        clientId: 'server_client',
        username: mqttCredentials.username,
        password: mqttCredentials.password,
        protocol: 'mqtt',
    };

    client = mqtt.connect(mqttBrokerOptions);

    // MQTT Event Handlers
    client.on('connect', () => {
        console.log('Connected to MQTT broker');

        // Subscribe to the topics
        client.subscribe('/sensors/leds/hallway/state');
        client.subscribe('/sensors/leds/frontroom/state');
    });

    client.on('message', (topic, message) => {
        // Send data to all connected clients using SSE
        clients.forEach(clientRes => {
            clientRes.write(`data: ${JSON.stringify({ topic, message: message.toString() })}\n\n`);
        });
    });

    res.sendStatus(200);
});

// Store clients because we need to broadcast to all connected clients
const clients = [];

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Add this client to the clients list
    clients.push(res);

    // When client closes connection we update the clients list
    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});

app.post('/process-form', (req, res) => {
    const formData = req.body;
    const topic = formData.lightId === 'hallwayLED' ? '/sensors/leds/hallway/command' : '/sensors/leds/frontroom/command';
    const light = formData.lightState === 'on' ? '1' : '0';
    console.log(`Publishing to ${topic}: ${light}`);
    client.publish(topic, light, { qos: 1 });

    res.send('Form data received and message sent to MQTT broker.');
});

app.listen(port, IPv4_HOST, () => {
    console.log(`Server is running on port ${port}`);
});