document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('mqttCredentialsModal');
    const submitBtn = document.getElementById('submitCredentialsBtn');
    const usernameField = document.getElementById('mqttUsername');
    const passwordField = document.getElementById('mqttPassword');
    const closeModalBtn = document.querySelector('.close');

    // Show the modal upon page loading
    modal.style.display = 'block';

    // Close the modal when the 'x' button is clicked
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    function submitCredentials() {
        const credentials = {
            username: usernameField.value,
            password: passwordField.value
        };
        // post credentials to server
        fetch('/set-credentials', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        })
        .then(response => {
            if (response.status !== 200) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Login failed');
                });
            }
            modal.style.display = 'none';
            setTimeout(establishEventSource, 2000);
        })
        .catch(error => {
            console.error('Error:', error.message);
            alert(error.message);
        });
    }
    submitBtn.addEventListener('click', submitCredentials);


    function establishEventSource() {
        const hallwayLED = document.getElementById('hallwayLED');
        const frontroomLED = document.getElementById('frontroomLED');
        const eventSource = new EventSource('/events');

        // when a message is received from the broker, check the state of the switches
        // to see if they match the state of the light
        eventSource.onmessage = (event) => {
            const { topic, message } = JSON.parse(event.data);

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

        // add event listeners for the toggle switches
        hallwayLED.addEventListener('change', toggleLightState);
        frontroomLED.addEventListener('change', toggleLightState);
    }

    function toggleLightState(event) {

        const light = event.target;
        const message = light.checked ? 'on' : 'off';
        const lightId = light.id;

        // post the state of the toggle switch to the server when a change happens
        fetch('/process-form', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lightId,
                lightState: message
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || 'Server Error');
                });
            }
            // Check if the response is JSON before parsing
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                return response.text();
            }
        })
        .catch(error => {
            console.error('Failed to toggle light state:', error);
        });
    }
});
