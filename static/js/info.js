// Close the window
/* Not possible anymore, because only windows opened by a script can be closed by a script again!
document.getElementById("keyboard_save_options").addEventListener("click", function () {
    window.close();
})
*/

// Check for updates
document.addEventListener("DOMContentLoaded", async function () {
	console.log("Checking for updates");
	
	    const updateNotice = document.getElementById("update_notice");

	if (updateNotice) {
	    updateNotice.textContent = "Checking for updates...";
	} else {
		console.warn("Could not display update information.");
	}

    try {
        const response = await fetch("/api/update");

        if (!response.ok) {
            throw new Error("Update check failed");
        }

        const data = await response.json();

		console.log(data);

        if (data.update_available) {
	        console.log("Update available");

            updateNotice.innerHTML =
                'Update available: version ' +
                data.latest_version +
                '. <a href="' +
                data.url +
                '" target="_blank" rel="noopener noreferrer">' +
                'View on GitHub</a><br>' +
                '<small>Last checked: ' +
                data.last_checked +
                '</small>';

        } else if (data.last_checked) {
	        console.log("Checked");

            updateNotice.innerHTML =
                'No updates available.<br>' +
                '<small>Last checked: ' +
                data.last_checked +
                '</small>';

        } else {
	        console.log("Other case");

            updateNotice.textContent =
                "No updates were found.";
        }

    } catch (error) {

        console.error("Update check failed:", error);

            
		if (updateNotice) {
        	updateNotice.textContent = "Could not check for updates.";
		} else {
			console.warn("Could not display update information.");
		}
    }
});