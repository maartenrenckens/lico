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
				errorNotices.value = "Loading errors…";
			}

            console.log("processed output loaded");
            
            
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
				
        })
        .catch(error => {

            console.error(
                "Could not load processed output:",
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


    // ---------------------------------------------------------
    // Load external file
    // ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const loadFileButton = document.getElementById("loadFileButton");
    const outputTextarea = document.getElementById("output");
    const errorTextarea = document.getElementById("error_notices");

    if (!loadFileButton || !outputTextarea) {
        return;
    }

    loadFileButton.addEventListener("click", () => {

        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.accept = ".linotype";
        fileInput.style.display = "none";

        document.body.appendChild(fileInput);

        fileInput.addEventListener("change", () => {

            const file = fileInput.files[0];

            if (!file) {
                fileInput.remove();
                return;
            }

            // Additional check because the browser's file picker
            // restriction is not a security guarantee.
            if (!file.name.toLowerCase().endsWith(".linotype")) {
                showError("Please select a .linotype file.");
                fileInput.remove();
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {

                const contents = reader.result;

                const lines = contents.split(/\r?\n/);

                // Check first line
                if (lines.length < 2 || lines[0] !== "# Linotype text") {
                    showError(
                        "Invalid .linotype file.\n\n" +
                        "The file must start with:\n" +
                        "# Linotype text"
                    );
                    fileInput.remove();
                    return;
                }

                // Check format version line
                const versionMatch = lines[1].match(
                    /^# Format version:\s*(\d+)\s*$/
                );

                if (!versionMatch) {
                    showError(
                        "Invalid .linotype file.\n\n" +
                        "The second line must contain a format version, for example:\n" +
                        "# Format version: 1"
                    );
                    fileInput.remove();
                    return;
                }

                const formatVersion = parseInt(versionMatch[1], 10);

                // Version must be 1 or higher
                if (formatVersion < 1) {
                    showError(
                        "Unsupported .linotype format version: " +
                        formatVersion +
                        ".\n\n" +
                        "This application requires format version 1 or higher."
                    );
                    fileInput.remove();
                    return;
                }

                // File is valid
                outputTextarea.value = contents;

                // Clear previous error message
                if (errorTextarea) {
                    errorTextarea.value = "";
                }

                console.log(
                    "Loaded .linotype file:",
                    file.name,
                    "Format version:",
                    formatVersion
                );

                fileInput.remove();
            };

            reader.onerror = () => {
                showError("The .linotype file could not be read.");
                fileInput.remove();
            };

            reader.readAsText(file);
        });

        fileInput.click();
    });


    function showError(message) {
        if (errorTextarea) {
            errorTextarea.value = message;
        } else {
            console.error(message);
        }
    }

});


    // ---------------------------------------------------------
    // Save external file
    // ---------------------------------------------------------

const saveFileButton = document.getElementById("saveFileButton");

if (saveFileButton) {
    saveFileButton.addEventListener("click", () => {

        const contents = document.getElementById("output").value;

        const blob = new Blob([contents], {
            type: "text/plain;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "output.linotype";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    });
}