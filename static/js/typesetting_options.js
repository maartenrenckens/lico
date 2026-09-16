document.addEventListener("DOMContentLoaded", function () {

    const UnitsUsedSelector = document.getElementById(
        "typesetting_units"
    );
    
    const lineLength = document.getElementById(
        "typesetting_line-length"
    );

    const wedgeSpace = document.getElementById(
        "typesetting_wedge_space_options"
    );

    const wedgeSpaceMinimum = document.getElementById(
        "wedge-space-minimum"
    );

    const wedgeSpaceMaximum = document.getElementById(
        "wedge-space-maximum"
    );

    const saveButton = document.getElementById(
        "typesetting_save_options"
    );

    // ---------------------------------------------------------
    // Default values
    // ---------------------------------------------------------

	const defaultUnitsUsed = "mm";
    const defaultLineLength = "8.0";
    const defaultWedgeSpace = "nothing";
	const defaultWedgeSpaceMinimum = 1.0;
	const defaultWedgeSpaceMaximum = 2.5;

    // ---------------------------------------------------------
    // Load the last saved typesetting values
    // ---------------------------------------------------------

	// ---------------------------------------------------------
	// Load the last saved typesetting values
	// ---------------------------------------------------------
	
	fetch("/api/typesetting")
		.then(response => {
	
			if (!response.ok) {
				throw new Error(
					"Could not load typesetting values"
				);
			}
	
			return response.json();
		})
		.then(data => {

            // Use saved value if available,
            // otherwise use the default value.

            UnitsUsedSelector.value =
                data.units_used ?? defaultUnitsUsed;
            
			lineLength.value =
				data.line_length ?? defaultLineLength;

            wedgeSpace.value =
                data.wedge_space ?? defaultWedgeSpace;

            wedgeSpaceMinimum.value =
                data.wedge_space_minimum ??
                defaultWedgeSpaceMinimum;

            wedgeSpaceMaximum.value =
                data.wedge_space_maximum ??
                defaultWedgeSpaceMaximum;

            console.log(
                "last saved typesetting values loaded"
            );
        })
        .catch(error => {

            console.error(
                "Could not load saved typesetting values:",
                error
            );

            UnitsUsedSelector.value =
                defaultUnitsUsed;

            lineLength.value =
                defaultLineLength;

            wedgeSpace.value =
                defaultWedgeSpace;

            wedgeSpaceMinimum.value =
                defaultWedgeSpaceMinimum;

            wedgeSpaceMaximum.value =
                defaultWedgeSpaceMaximum;

            // If loading fails, use defaults.

            lineLength.value = defaultLineLength;
            wedgeSpace.value = defaultWedgeSpace;
        });

    // ---------------------------------------------------------
    // Save & process text
    // ---------------------------------------------------------

    saveButton.addEventListener("click", function () {

        // -----------------------------------------------------
        // Validate numbers
        // -----------------------------------------------------

        const normalizedLineLength =
            normalizeNumber(lineLength.value);

        const normalizedWedgeSpaceMinimum =
            normalizeNumber(wedgeSpaceMinimum.value);

        const normalizedWedgeSpaceMaximum =
            normalizeNumber(wedgeSpaceMaximum.value);


        // Check line length

        if (
            typeof normalizedLineLength !== "number"
        ) {

            alert(
                normalizedLineLength.error
            );

            return;
        }


        // Check minimum wedge space

        if (
            typeof normalizedWedgeSpaceMinimum !== "number"
        ) {

            alert(
                normalizedWedgeSpaceMinimum.error
            );

            return;
        }


        // Check maximum wedge space

        if (
            typeof normalizedWedgeSpaceMaximum !== "number"
        ) {

            alert(
                normalizedWedgeSpaceMaximum.error
            );

            return;
        }


        // -----------------------------------------------------
        // Disable button
        // -----------------------------------------------------

        saveButton.disabled = true;

        saveButton.style.backgroundColor = "#cccccc";
        saveButton.style.color = "#666666";
        saveButton.textContent = "one moment";


        // -----------------------------------------------------
        // Collect normalized values
        // -----------------------------------------------------

        const typesettingData = {

            units_used:
                UnitsUsedSelector.value,
                
            line_length:
                normalizedLineLength,

            wedge_space_addition:
                wedgeSpace.value,

            wedge_space_minimum:
                normalizedWedgeSpaceMinimum,

            wedge_space_maximum:
                normalizedWedgeSpaceMaximum
        };


        // -----------------------------------------------------
        // Save current typesetting values
        // -----------------------------------------------------

        fetch("/api/typesetting", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(
                typesettingData
            )
        })
        .then(response => {

            if (!response.ok) {
                throw new Error(
                    "Saving failed"
                );
            }

            return response.json();
        })
        .then(data => {

            if (!data.success) {
                throw new Error(
                    data.error ||
                    "Saving failed"
                );
            }

            console.log(
                "typesetting values saving succeeded"
            );

            window.location.href = "/output";
        })
        .catch(error => {

            console.error(
                "Could not save typesetting values:",
                error
            );

            saveButton.disabled = false;
            saveButton.style.backgroundColor = "";
            saveButton.style.color = "";
            saveButton.textContent = "Process text";

            alert(
                "The typesetting options could not be saved."
            );
        });

    });

});

console.log("typesetting_options script loaded");