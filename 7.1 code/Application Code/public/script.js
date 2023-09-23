document.addEventListener('DOMContentLoaded', () => {
    // Establish the EventSource connection on page load
    establishEventSource();

    function establishEventSource() {
        const hallwayLED = document.getElementById('hallwayLED');
        const frontroomLED = document.getElementById('frontroomLED');
        const eventSource = new EventSource('/events');

        eventSource.onmessage = (event) => {
            const { topic, message } = JSON.parse(event.data);
            // update the position of the switches based on message received from server-side
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

        // add event listeners for the switches on the webpage
        hallwayLED.addEventListener('change', toggleLightState);
        frontroomLED.addEventListener('change', toggleLightState);
    }

    function toggleLightState(event) {
        const light = event.target;
        const message = light.checked ? 'on' : 'off';
        const lightId = light.id;
        
        // send the new state of the switch to the server-side to publish
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
                return response.json().then(data => {
                    throw new Error(data.error || 'Server Error');
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
