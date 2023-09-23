const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;
const IPv4_HOST = '0.0.0.0';

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let client;
let storedCredentials = JSON.parse(fs.readFileSync('credentials.json', 'utf-8'));

app.post('/set-credentials', (req, res) => {
    const { username, password } = req.body;

    if (username === storedCredentials.username && password === storedCredentials.password) {
        console.log('Login Successful');
        // Disconnect from previous MQTT connection if it exists
        if (client && client.connected) {
            client.end();
        }

        // Connect to MQTT
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
            client.subscribe('/sensors/leds/hallway/state');
            client.subscribe('/sensors/leds/frontroom/state');
        });

        client.on('message', (topic, message) => {
            clients.forEach(clientRes => {
                clientRes.write(`data: ${JSON.stringify({ topic, message: message.toString() })}\n\n`);
            });
        });

        res.sendStatus(200);
    } else {
        res.status(401).send('Invalid credentials');
    }
});

const clients = [];

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

    client.publish(topic, light, { qos: 1 });
    res.send('Form data received and message sent to MQTT broker.');
});

app.listen(port, IPv4_HOST, () => {
    console.log(`Server is running on port ${port}`);
});
