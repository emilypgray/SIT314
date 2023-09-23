const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const https = require('https');
const bcrypt = require('bcrypt');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Create HTTPS server with self-signed certificate
const httpsServer = https.createServer({
    key: fs.readFileSync('server_certs/Key.pem'),
    cert: fs.readFileSync('server_certs/Cert.pem'),
}, app);

let client;

// Load the hashed password from the passwords.txt file
const passwordFileData = fs.readFileSync('passwords.txt', 'utf-8');
const [storedUsername, storedHashedPassword] = passwordFileData.split(':');

app.post('/set-credentials', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Compare the entered password with the stored hashed password
        const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

        if (username === storedUsername && passwordMatch) {
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
                // on connect, subscribe to state topics
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
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
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

    // publish information received from client-side to broker
    client.publish(topic, light, { qos: 1 });
    res.send('Form data received and message sent to MQTT broker.');
});

// Listen on the HTTPS server
httpsServer.listen(443, null, () => {
    console.log('HTTPS Server is running on port 443');
});
