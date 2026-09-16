document.addEventListener("DOMContentLoaded", () => {
	console.log("starting preview generation");

    const previewBox = document.getElementById("preview_box");

    if (!previewBox) {
	    console.log("previewBox not found");
        return;
    }


    // ---------------------------------------------------------
    // Load preview data
    // ---------------------------------------------------------

    fetch("/api/preview")
        .then(response => {

            if (!response.ok) {
                throw new Error("Could not load preview");
            }

            return response.json();
        })
        .then(data => {

            if (data.processing) {
                renderPreview(data.processing);
            } else {
                previewBox.textContent = "Nothing to preview.";
            }

            console.log("preview loaded");

        })
        .catch(error => {

            console.error(
                "Could not load preview:",
                error
            );

            previewBox.textContent = "Could not load preview.";

        });


    // ---------------------------------------------------------
    // Render preview
    // ---------------------------------------------------------

    function renderPreview(text) {

        previewBox.innerHTML = "";

        const lines = text.split(/\r?\n/);

        let currentRow = createRow();

        lines.forEach(line => {

            line = line.trim();

            // Ignore empty lines and comments
            if (!line || line.startsWith("#")) {
                return;
            }

            if (!line.startsWith("key ")) {
                return;
            }


            // -------------------------------------------------
            // Check for line ending
            // -------------------------------------------------

			if (line.includes("{line_ending}")) {
			
				// Add the line-ending box to the CURRENT row
				const lineEndingBox = renderLineEnding(line);
			
				if (lineEndingBox) {
					currentRow.appendChild(lineEndingBox);
				}
			
				// Now finish the current row
				if (currentRow.children.length > 0) {
					previewBox.appendChild(currentRow);
				}
			
				// Everything after line_ending belongs
				// to the next line.
				currentRow = createRow();
			
				return;
			}


            // -------------------------------------------------
            // Normal character / instruction
            // -------------------------------------------------

            const box = createInstructionBox(line);

            if (box) {
                currentRow.appendChild(box);
            }

        });


        // Add final row
        if (currentRow.children.length > 0) {
            previewBox.appendChild(currentRow);
        }
    }


    // ---------------------------------------------------------
    // Create a normal instruction box
    // ---------------------------------------------------------

    function createInstructionBox(line) {

        const fields = extractBraceFields(line);

        if (fields.length < 2) {
            return null;
        }


        /*
         * Expected format:
         *
         * key {1, 19} {,} {33} {0.75} [orig:auto]
         *
         * fields:
         *   0 = 1, 19
         *   1 = ,
         *   2 = 33
         *   3 = 0.75
         */


        const identifier = fields[0];
        const character = fields[1];
		
		// Default name
		let displayCharacter = character;

		if (character === "wedge_space") {
		
			displayCharacter = "var";
		
		} else if (character === "line_ending") {
		
			displayCharacter = "end";
			
		} else if (character === "thin space") {
		
			displayCharacter = "thin";
			
		} else if (character === "en space") {
		
			displayCharacter = "em";
			
		} else if (character === "em space") {
		
			displayCharacter = "em";
			
		}

        const box = document.createElement("div");
        box.className = "preview-instruction";
        
		if (character === "wedge_space") {
			box.classList.add("preview-wedge_space");
		} else if (character === "line_ending") {
			box.classList.add("preview-line_ending");
		}

        // The final numeric brace field is the width.
        let width = null;

        for (let i = fields.length - 1; i >= 2; i--) {

            const value = parseFloat(
                fields[i].replace(",", ".")
            );

            if (!isNaN(value)) {
                width = value;
                break;
            }
        }


        // Identifier
        const identifierElement = document.createElement("div");
        identifierElement.className = "preview-identifier";
        identifierElement.textContent = `{${identifier}}`;


        // Character / instruction
        const characterElement = document.createElement("div");
        characterElement.className = "preview-character";
        characterElement.textContent = displayCharacter;


        // Width
        const widthElement = document.createElement("div");
        widthElement.className = "preview-width";

        if (width !== null) {
            widthElement.textContent = formatNumber(width);
        }


        box.appendChild(identifierElement);
        box.appendChild(characterElement);
        box.appendChild(widthElement);


        // -----------------------------------------------------
        // Proportional width
        // -----------------------------------------------------

		if (character === "wedge_space") {
		
			// Do nothing. We do this with a class now.
			// box.style.width = "4em";
		
		} else if (character === "line_ending") {
		
			// Do nothing. We do this with a class now.
			// box.style.width = "4em";
			
		} else if (width !== null && width > 0) {
		
			box.style.width = `${width}em`;
		
		} else {
		
			box.style.width = "3em";
		}

        return box;
    }


    // ---------------------------------------------------------
    // Render variable line ending
    // ---------------------------------------------------------

function renderLineEnding(line) {

    const min = getMetadataNumber(
        line,
        "line_min_length"
    );

    const max = getMetadataNumber(
        line,
        "line_max_length"
    );


    let difference = null;

    if (min !== null && max !== null) {
        difference = max - min;
    }


    const box = document.createElement("div");
    box.className = "preview-instruction preview-variable";


    // ---------------------------------------------------------
    // Identifier
    // ---------------------------------------------------------

    const identifierElement = document.createElement("div");
    identifierElement.className = "preview-identifier";

    const identifier = getFirstBraceField(line);

    identifierElement.textContent =
        identifier !== null
            ? `{${identifier}}`
            : "";


    // ---------------------------------------------------------
    // Variable indicator
    // ---------------------------------------------------------

    const variableElement = document.createElement("div");
    variableElement.className = "preview-character";
    variableElement.textContent = "var";


    // ---------------------------------------------------------
    // Difference between minimum and maximum
    // ---------------------------------------------------------

    const differenceElement = document.createElement("div");
    differenceElement.className = "preview-width";

    if (difference !== null) {
        differenceElement.textContent =
            formatNumber(difference);
    }


    box.appendChild(identifierElement);
    box.appendChild(variableElement);
    box.appendChild(differenceElement);


    // Line endings have no fixed width
    box.style.width = "3em";


    // IMPORTANT:
    // Return the box instead of adding it directly
    // to previewBox.
    return box;
}


    // ---------------------------------------------------------
    // Extract { ... } fields
    // ---------------------------------------------------------

    function extractBraceFields(line) {

        const matches = line.match(/\{([^{}]*)\}/g);

        if (!matches) {
            return [];
        }

        return matches.map(field => {
            return field.substring(
                1,
                field.length - 1
            );
        });
    }


    // ---------------------------------------------------------
    // First brace field
    // ---------------------------------------------------------

    function getFirstBraceField(line) {

        const match = line.match(/\{([^{}]*)\}/);

        if (!match) {
            return null;
        }

        return match[1];
    }


    // ---------------------------------------------------------
    // Read metadata number
    // ---------------------------------------------------------

    function getMetadataNumber(line, name) {

        const escapedName = name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const regex = new RegExp(
            "\\[" + escapedName + ":([^\\]]+)\\]"
        );

        const match = line.match(regex);

        if (!match) {
            return null;
        }

        const value = parseFloat(
            match[1].replace(",", ".")
        );

        return isNaN(value) ? null : value;
    }


    // ---------------------------------------------------------
    // Format numbers
    // ---------------------------------------------------------

    function formatNumber(value) {

        return value
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1")
            .replace(".", ",");
    }


    // ---------------------------------------------------------
    // Create a new preview row
    // ---------------------------------------------------------

    function createRow() {

        const row = document.createElement("div");
        row.className = "preview-row";

        return row;
    }

});