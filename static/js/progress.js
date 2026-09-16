document.addEventListener("DOMContentLoaded", function () {

    const progressText = document.getElementById("progresstext");
    const stopButton = document.getElementById("castingStopButton");


    // ---------------------------------------------------------
    // Load casting tracking
    // ---------------------------------------------------------

    function loadCastingTracking() {

		progressText.value = "Loading…";

		setTimeout(function () {
			fetch("/api/casting_tracking")
				.then(response => {
	
					if (!response.ok) {
						throw new Error(
							"Could not load casting tracking"
						);
					}
	
					return response.text();
				})
				.then(data => {
	
					progressText.value = data;
	
					console.log(
						"casting tracking loaded"
					);
				})
				.catch(error => {
	
					console.error(
						"Could not load casting tracking:",
						error
					);
				});
        }, 400);
    }


    // ---------------------------------------------------------
    // Load immediately after page load
    // ---------------------------------------------------------

    loadCastingTracking();


    // ---------------------------------------------------------
    // Load every 5 seconds
    // ---------------------------------------------------------

    setInterval(
        loadCastingTracking,
        7500
    );


    // ---------------------------------------------------------
    // Stop casting
    // ---------------------------------------------------------

    stopButton.addEventListener("click", function () {

        console.log(
            "stop casting button clicked"
        );

        stopButton.disabled = true;
        stopButton.style.backgroundColor = "#cccccc";
        stopButton.style.color = "#666666";
        stopButton.textContent = "one moment";


        fetch("/api/casting_stop", {
            method: "POST"
        })
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    "Could not stop casting"
                );
            }

            return response.text();
        })
        .then(data => {

            console.log(
                "casting stopped:",
                data
            );

            // Refresh tracking immediately
            loadCastingTracking();


            stopButton.disabled = false;
            stopButton.style.backgroundColor = "";
            stopButton.style.color = "";
            stopButton.textContent = "Stop casting";
        })
        .catch(error => {

            console.error(
                "Could not stop casting:",
                error
            );

            stopButton.disabled = false;
            stopButton.style.backgroundColor = "";
            stopButton.style.color = "";
            stopButton.textContent = "Stop casting";

            alert(
                "The casting could not be stopped."
            );
        });
    });

});


console.log("casting tracking script loaded");