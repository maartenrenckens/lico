// ---------------------------------------------------------
// Functions which are available everywhere
// ---------------------------------------------------------


// ---------------------------------------------------------
// Check and normalize a number
// ---------------------------------------------------------


function normalizeNumber(value) {

    // Already a number
    if (typeof value === "number") {

        if (Number.isFinite(value)) {
            return value;
        }

        return {
            error: "Invalid number"
        };
    }


    // Convert to string and remove surrounding whitespace
    let normalized = String(value).trim();


    // Empty value
    if (normalized === "") {

        return {
            error: "No number was entered"
        };
    }


    // Convert decimal comma to decimal point
    normalized = normalized.replace(",", ".");


    // Check that the complete value is a valid number
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {

        return {
            error: `"${value}" is not a valid number`
        };
    }


    // Convert to JavaScript number
    const number = Number(normalized);


    if (!Number.isFinite(number)) {

        return {
            error: `"${value}" is not a valid number`
        };
    }


    return number;
}