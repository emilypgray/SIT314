#include <SPI.h>
#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include "network_credentials.h"
#include "mqtt_logins.h"
#include "config.h"

// declare the inputs/outputs and the initial LED state
const uint8_t switchPin1 = 2;
const uint8_t led1 = 11;
const uint8_t switchPin2 = 3;
const uint8_t led2 = 12;
volatile bool ledState1 = LOW;
volatile bool ledState2 = LOW;

// wifi credentials
const char ssid[] = SECRET_SSID;
const char pass[] = SECRET_PASS;    
int status = WL_IDLE_STATUS;
// int keyIndex = 0;  

// broker options
const char* broker = "ec2-3-27-123-38.ap-southeast-2.compute.amazonaws.com";
const int port = 1883;

// publish/subscribe options
const bool retained = false;
const bool dup = false;
const int publishQos = 0; // messages are published every second, and so lowest QoS level is sufficient as broker will receive another message in 1s if message fails
const int subscribeQos = 1; // the arduino must receive the command messages at least once
char payload[2];

// topics
const char led_hallway_state[] = "/sensors/leds/hallway/state";
const char led_hallway_command[] = "/sensors/leds/hallway/command";
const char led_frontroom_state[] = "/sensors/leds/frontroom/state";
const char led_frontroom_command[] = "/sensors/leds/frontroom/command";


// wifi/broker clients
WiFiClient client;
MqttClient mqttClient(client);

// from examples > 02.Digital > blinkWithoutDelay
const long interval = 1000;
unsigned long previousMillis = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial) { // wait for the serial to begin
  }

  while (status != WL_CONNECTED) { // connect to the network
    Serial.print("Connecting to the network ... ");
    status = WiFi.begin(ssid, pass);
    delay(10000);
  }
  Serial.println("Connected to the network.");

  connectToBroker(); // connect to the MQTT broker

  // declare pin types and attach interrups
  pinMode(switchPin1, INPUT);
  pinMode(led1, OUTPUT);
  pinMode(switchPin2, INPUT);
  pinMode(led2, OUTPUT);
  attachInterrupt(digitalPinToInterrupt(switchPin1), toggleLed1, RISING); // only interrup if the button is being pushed (not released)
  attachInterrupt(digitalPinToInterrupt(switchPin2), toggleLed2, RISING);

  mqttClient.onMessage(onMqttMessage);
}

void loop() {

  mqttClient.poll();

  // if there are incoming bytes available
  // from the server, read them and print them:
  while (client.available()) {
    char c = client.read();
    Serial.write(c);
  }

  if (!mqttClient.connected()) {
    Serial.println("Lost connection to the MQTT broker, attempting to reconnect...");
    connectToBroker(); // Try reconnecting to the broker
  }

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    publishToBroker(ledState1, led_hallway_state);
    publishToBroker(ledState2, led_frontroom_state);
  }


}


void toggleLed1(){
  ledState1 = !ledState1;
  digitalWrite(led1, ledState1);
} 

void toggleLed2(){
  ledState2 = !ledState2;
  digitalWrite(led2, ledState2);
}


void connectToBroker() {
  // set broker options
  mqttClient.setUsernamePassword(USERNAME, PASSWORD);
  mqttClient.setId(MQTT_CLIENT_ID);
  // connect
  Serial.print("Connecting to the MQTT broker... ");
  // Serial.println(broker);
  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    delay(5000);
  }
  Serial.println("Connected to the broker.");
  Serial.println();
  mqttClient.subscribe(led_hallway_command, subscribeQos);
  Serial.print("Subscribed to topic: ");
  Serial.println(led_hallway_command);
  mqttClient.subscribe(led_frontroom_command, subscribeQos);
  Serial.print("Subscribed to topic: ");
  Serial.println(led_frontroom_command);
}


void publishToBroker(bool ledState, const char* topic) {
    payload[0] = ledState ? '1': '0';
    payload[1] = '\0';
    mqttClient.beginMessage(topic, strlen(payload), retained, publishQos, dup);
    mqttClient.print(payload);
    mqttClient.endMessage();
    Serial.print("published to topic: ");
    Serial.println(topic);
}


void onMqttMessage(int messageSize) {
  String topic = mqttClient.messageTopic();
  String payload = "";

  for (int i = 0; i < messageSize; i++) {
    payload += (char)mqttClient.read();
  }

  if (topic == led_hallway_command) {
    Serial.print("message received for led 1 with command: ");
    Serial.println(payload);
    ledState1 = !ledState1;
    digitalWrite(led1, ledState1);
    publishToBroker(ledState1, led_hallway_state);   
  } else if (topic == led_frontroom_command) {
    Serial.print("message received for led 2 with command: ");
    Serial.println(payload);
    ledState2 = !ledState2;
    digitalWrite(led2, ledState2);
    publishToBroker(ledState2, led_frontroom_state);
  } 
}





