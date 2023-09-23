document.addEventListener('DOMContentLoaded', () => {
  // get element ids from index.html
  const modal = document.getElementById('mqttCredentialsModal');
  const submitBtn = document.getElementById('submitCredentialsBtn');
  const usernameField = document.getElementById('mqttUsername');
  const passwordField = document.getElementById('mqttPassword');
  const closeModalBtn = document.querySelector('.close');

  function submitCredentials() {
    // get credentials entered by user on webapge
      const mqttCredentials = {
          username: usernameField.value,
          password: passwordField.value
      };

    // send credentials to server-side
      fetch('/set-mqtt-credentials', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(mqttCredentials)
      }).then(response => {
          if (response.status !== 200) {
              console.error('Failed to set MQTT credentials on server');
          } else {
              // Close the modal if the credentials are successfully sent
              modal.style.display = 'none';
          }
      });
  }

  // Attach the submit function to the button
  submitBtn.addEventListener('click', submitCredentials);

  // get light ids
  const hallwayLED = document.getElementById('hallwayLED');
  const frontroomLED = document.getElementById('frontroomLED');
  const eventSource = new EventSource('/events');

  // update switches on page when message received from broker indicating change of state
  eventSource.onmessage = (event) => {
      const { topic, message } = JSON.parse(event.data);
      console.log(`Received message on ${topic}: ${message}`);

      if (topic === '/sensors/leds/hallway/state') {
          hallwayLED.checked = message === '1';
      } else if (topic === '/sensors/leds/frontroom/state') {
          frontroomLED.checked = message === '1';
      }
  };

  eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
  };

  // add event listeners for switches. publish changes in state to broker
  hallwayLED.addEventListener('change', () => {
      const message = hallwayLED.checked ? 'on' : 'off';
      fetch('/process-form', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              lightId: 'hallwayLED',
              lightState: message
          })
      });
  });

  frontroomLED.addEventListener('change', () => {
      const message = frontroomLED.checked ? 'on' : 'off';
      fetch('/process-form', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              lightId: 'frontroomLED',
              lightState: message
          })
      });
  });

  // Show the modal upon page loading
  modal.style.display = 'block';

  // Close the modal when the 'x' button is clicked
  closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
  });
});
