document.addEventListener("DOMContentLoaded", function () {

    const textarea = document.getElementById("input_text");
    const saveButton = document.getElementById("index_save_input");

    // ---------------------------------------------------------
    // Load the last saved text
    // ---------------------------------------------------------

    fetch("/api/input")
        .then(response => response.json())
        .then(data => {
            textarea.value = data.text || "";
            console.log("last saved text loaded");
        })
        .catch(error => {
            console.error("Could not load saved input:", error);
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

        // Save current text
        fetch("/api/input", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: textarea.value
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Saving failed");
            }

            // Saving succeeded → continue
            console.log("saving succeeded");
            window.location.href = "/keyboard-options";
        })
        .catch(error => {
            console.error("Could not save input:", error);

            // Restore button if saving failed
            saveButton.disabled = false;
            saveButton.style.backgroundColor = "";
            saveButton.style.color = "";
            saveButton.textContent = "Save & next";

            alert("The text could not be saved.");
        });
    });
});

console.log("input script loaded");
