const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create an HTTPS server with self-signed certificate
const httpsServer = https.createServer({
    key: fs.readFileSync('server_certs/Key.pem'),
    cert: fs.readFileSync('server_certs/Cert.pem'),
}, app);

let client;

app.get('/events', (req, res) => {
    if (!client || !client.connected) {
        res.status(401).send('Unauthorized: Please provide valid credentials first.');
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);

    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) {
            clients.splice(index, 1);
        }
    });
});

app.post('/process-form', (req, res) => {
    if (!client || !client.connected) {
        res.status(401).send('Unauthorized: Please provide valid credentials first.');
        return;
    }
    const formData = req.body;
    const topic = formData.lightId === 'hallwayLED' ? '/sensors/leds/hallway/command' : '/sensors/leds/frontroom/command';
    const light = formData.lightState === 'on' ? '1' : '0';

    // Publish MQTT message
    client.publish(topic, light, { qos: 1 });

    // Send a response to the client
    res.status(200).json({ message: 'Form data received and message sent to MQTT broker.' });
});

// Connect to MQTT on server startup
const mqttBrokerOptions = {
    hostname: 'a3kvpx8bd0q9lp-ats.iot.ap-southeast-2.amazonaws.com',
    port: 8883,
    clientId: 'server_client',
    protocol: 'mqtts',
    key: fs.readFileSync('certs/private.pem.key'),
    cert: fs.readFileSync('certs/device.pem.crt'),
    ca: fs.readFileSync('certs/Amazon-root-CA-1.pem'),
};

client = mqtt.connect(mqttBrokerOptions);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    // subscribe to state topics
    client.subscribe('/sensors/leds/hallway/state');
    client.subscribe('/sensors/leds/frontroom/state');
});

client.on('message', (topic, message) => {
    // send received message to client-side program
    clients.forEach(clientRes => {
        clientRes.write(`data: ${JSON.stringify({ topic, message: message.toString() })}\n\n`);
    });
});

const clients = [];

// Listen on the HTTPS server
httpsServer.listen(443, null, () => {
    console.log('HTTPS Server is running on port 443');
});
