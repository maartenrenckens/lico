document.addEventListener("DOMContentLoaded", function () {

    const inputs = document.querySelectorAll(".glyph-input");
    const keyboardLayout = document.getElementById("keyboard-layout");
    const saveButton = document.getElementById("keyboard_save_options");

    // ---------------------------------------------------------
    // Load the last saved keyboard values
    // ---------------------------------------------------------

    fetch("/api/keyboard")
        .then(response => response.json())
        .then(data => {

            inputs.forEach(input => {

                if (data[input.id] !== undefined) {
                    input.value = data[input.id];
                }

            });

            console.log("last saved keyboard values loaded");
        })
        .catch(error => {
            console.error("Could not load saved keyboard values:", error);
        });


	// ---------------------------------------------------------
	// Keyboard layout selector
	// ---------------------------------------------------------
	
	keyboardLayout.addEventListener("change", function () {
	
		const selectedLayout = keyboardLayout.value;
	
	
		// -----------------------------------------------------
		// Last loaded layout
		// -----------------------------------------------------
	
		if (selectedLayout === "last-loaded") {
	
			console.log(
				"Keeping last loaded keyboard layout"
			);
	
			return;
		}
	
	
		// -----------------------------------------------------
		// Load preset keyboard layout
		// -----------------------------------------------------
	
		fetch(
			"/static/defaults/default_matrix_thickness.json"
		)
			.then(response => {
	
				if (!response.ok) {
	
					throw new Error(
						"Could not load keyboard preset"
					);
				}
	
				return response.json();
			})
			.then(data => {
	
				console.log(
					"Keyboard preset loaded:",
					selectedLayout
				);
	
	
				// -------------------------------------------------
				// Find the selected layout in the JSON
				// -------------------------------------------------
	
				const rows = data.rows;
	
	
				// -------------------------------------------------
				// Fill the keyboard table
				// -------------------------------------------------
	
				rows.forEach(row => {
	
					const key = row.nr;
	
					const glyphInput =
						document.getElementById(
							`${key}_glyph`
						);
	
					const widthInput =
						document.getElementById(
							`${key}_width`
						);
	
	
					// Glyph name
	
					if (glyphInput) {
	
						glyphInput.value =
							row.name || "";
					}
	
	
					// Matrix thickness / width
	
					if (widthInput) {
	
						const thickness =
							row.thickness[selectedLayout];
	
						if (
							thickness !== undefined &&
							thickness !== null
						) {
	
							widthInput.value =
								thickness;
	
						} else {
	
							widthInput.value = "";
						}
					}
	
				});
	
	
				console.log(
					"Keyboard preset applied"
				);
	
			})
			.catch(error => {
	
				console.error(
					"Could not load keyboard preset:",
					error
				);
	
				alert(
					"The keyboard preset could not be loaded."
				);
	
				// Return selector to previous option
				keyboardLayout.value = "last-loaded";
			});
	
	});


    // ---------------------------------------------------------
    // Save & next
    // ---------------------------------------------------------

    saveButton.addEventListener("click", function () {

        // Disable button immediately
        saveButton.disabled = true;

        // Change appearance/text
        saveButton.style.backgroundColor = "#cccccc";
        saveButton.style.color = "#666666";
        saveButton.textContent = "one moment";

        // Collect all keyboard values
        const keyboardData = {};

        inputs.forEach(input => {
            keyboardData[input.id] = input.value;
        });

        // Save current keyboard values
        fetch("/api/keyboard", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(keyboardData)
        })
        .then(response => {

            if (!response.ok) {
                throw new Error("Saving failed");
            }

            console.log("keyboard values saving succeeded");

            window.location.href = "/typesetting-options";
        })
        .catch(error => {

            console.error(
                "Could not save keyboard values:",
                error
            );

            // Restore button if saving failed
            saveButton.disabled = false;
            saveButton.style.backgroundColor = "";
            saveButton.style.color = "";
            saveButton.textContent = "Save & next";

            alert("The keyboard values could not be saved.");
        });

    });

});

console.log("keyboard_options script loaded");
