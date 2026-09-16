document.addEventListener("DOMContentLoaded", function () {

    const castingStartButton = document.getElementById("castingStartButton");
    const errorNotices = document.getElementById("error_notices");
    const output = document.getElementById("output");


    // ---------------------------------------------------------
    // Load processed output
    // ---------------------------------------------------------

    fetch("/api/processing_input")
        .then(response => {

            if (!response.ok) {
                throw new Error("Could not load processed output");
            }

            return response.json();
        })
        .then(data => {
			if (data.processing) {
				output.value = data.processing;
			} else {
				output.value = "Nothing was processed.";
			}

            console.log("processed output loaded");
        })
        .catch(error => {

            console.error(
                "Could not load processed output:",
                error
            );
        });


    // ---------------------------------------------------------
    // Load errors
    // ---------------------------------------------------------

    fetch("/api/processing_errors")
        .then(response => {

            if (!response.ok) {
                throw new Error("Could not load errors");
            }

            return response.json();
        })
        .then(data => {
			if (data.errors) {
				errorNotices.value = data.errors;
			} else {
				errorNotices.value = "No errors.";
			}

            console.log("errors loaded");
        })
        .catch(error => {

            console.error(
                "Could not load errors:",
                error
            );
        });


    // ---------------------------------------------------------
    // Start casting button
    // ---------------------------------------------------------

    castingStartButton.addEventListener("click", function () {

        console.log("start casting button clicked");

        // Disable button immediately
        castingStartButton.disabled = true;

        // Change appearance/text
        castingStartButton.style.backgroundColor = "#cccccc";
        castingStartButton.style.color = "#666666";
        castingStartButton.textContent = "one moment";


        fetch("/api/casting_start", {
            method: "POST"
        })
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    "Casting could not be started"
                );
            }

            return response.json();
        })
        .then(data => {

            if (!data.success) {
                throw new Error(
                    data.error || "Casting could not be started"
                );
            }

            console.log("casting started");

            // Go to progress page
            window.location.href = "/progress";

        })
        .catch(error => {

            console.error(
                "Could not start casting:",
                error
            );

            // Restore button
            castingStartButton.disabled = false;
            castingStartButton.style.backgroundColor = "";
            castingStartButton.style.color = "";
            castingStartButton.textContent = "Start casting";

            alert(
                "There is no casting device attached."
            );
        });

    });

});

console.log("output script loaded");