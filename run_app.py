# LiCo, the Linotype Computer Connection

from flask import Flask, render_template, request
import os
import webbrowser
import json
import threading
import socket
import requests
from datetime import datetime, timezone, timedelta
from packaging.version import Version

from config import (
    APP_VERSION,
    UPDATE_CACHE_FILE,
    UPDATE_CHECK_INTERVAL,
    GITHUB_RELEASES_URL,
)


app = Flask(__name__)


INPUT_FILE = os.path.join("data", "input.txt")
INPUT_FILE_BACKUP = os.path.join("static", "defaults", "input.txt")
KEYBOARD_FILE = os.path.join("data", "keyboard.json")
TYPESETTING_FILE = os.path.join("data", "typesetting.json")
PROCESSING_FILE = os.path.join("data", "processed_text.linotype")
PROCESSING_ERROR_FILE = os.path.join("data", "processing_input_errors.txt")
CASTING_TRACKING_FILE = os.path.join("data", "casting_tracking.txt")


# ---------------------------------------------------------
# Update mechanism
# ---------------------------------------------------------

@app.route("/api/update")
def check_for_update():

    now = datetime.now(timezone.utc)

    # --------------------------------------------------
    # Read existing cache
    # --------------------------------------------------

    cache = None

    try:

        if os.path.exists(UPDATE_CACHE_FILE):

            with open(
                UPDATE_CACHE_FILE,
                "r",
                encoding="utf-8"
            ) as file:

                cache = json.load(file)

    except (OSError, json.JSONDecodeError) as error:

        print(f"Could not read update cache: {error}")

        cache = None


    # --------------------------------------------------
    # Check whether the cache is still valid
    # --------------------------------------------------

    if cache and cache.get("checked_at"):

        try:

            checked_at = datetime.fromisoformat(
                cache["checked_at"]
            )

            # Make old cache timestamps timezone-aware
            if checked_at.tzinfo is None:
                checked_at = checked_at.replace(
                    tzinfo=timezone.utc
                )

            cache_age = now - checked_at

            if cache_age < UPDATE_CHECK_INTERVAL:

                # Cache is still valid.
                # Do NOT contact GitHub.

                return cache

        except (ValueError, TypeError) as error:

            print(
                f"Invalid update cache timestamp: {error}"
            )

    # --------------------------------------------------
    # Cache is missing or older than 48 hours.
    # Contact GitHub.
    # --------------------------------------------------

    try:

        response = requests.get(
            GITHUB_RELEASES_URL,
            timeout=5,
            headers={
                "Accept": "application/vnd.github+json"
            }
        )

        response.raise_for_status()

        release = response.json()

        latest_version = release["tag_name"]

        if latest_version.startswith("v"):
            latest_version = latest_version[1:]

        current_version = Version(APP_VERSION)
        github_version = Version(latest_version)

        update_available = (
            github_version > current_version
        )

        cache = {
            "update_available": update_available,
            "current_version": APP_VERSION,
            "latest_version": latest_version,
            "url": release.get(
                "html_url",
                "https://github.com/maartenrenckens/lico"
            ),
            "checked_at": now.isoformat()
        }

        # --------------------------------------------------
        # Save new cache
        # --------------------------------------------------

        os.makedirs(
            os.path.dirname(UPDATE_CACHE_FILE),
            exist_ok=True
        )

        with open(
            UPDATE_CACHE_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                cache,
                file,
                indent=4
            )

        return cache

    # --------------------------------------------------
    # GitHub check failed
    # --------------------------------------------------

    except (
        requests.RequestException,
        KeyError,
        TypeError,
        ValueError
    ) as error:

        print(
            f"GitHub update check failed: {error}"
        )

        # If an old cache exists, return it rather than
        # making the application appear broken.

        if cache:

            return cache

        return {
            "update_available": False,
            "current_version": APP_VERSION,
            "latest_version": None,
            "url": None,
            "checked_at": None,
            "error": True
        }


# ---------------------------------------------------------
# Network configuration
# ---------------------------------------------------------

SERVER_PORT = 5747

def fn_get_local_ip():
    """
    Determine the local IP address used for network connections.

    This does not send application data to 8.8.8.8.
    It only asks the operating system which local interface
    would be used to reach that address.
    """

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]

    except OSError:
        return "127.0.0.1"

    finally:
        s.close()


def fn_get_local_hostname():
    """
    Get the computer's hostname.
    """

    try:
        hostname = socket.gethostname()

        if hostname:
            return hostname

    except OSError:
        pass

    return None


# It asks the operating system:
# "Does this computer/network have mDNS support, and does this hostname resolve?"
# If yes, we use it.
# If not, we automatically fall back to something like: http://192.168.129.123:5747

def fn_get_local_network_address():
    """
    Determine the address that should be shown to users.

    Preferred:
        http://hostname.local:5747

    Fallback:
        http://local-ip:5747
    """

    local_ip = fn_get_local_ip()
    hostname = fn_get_local_hostname()

    # -----------------------------------------------------
    # Try the .local hostname
    # -----------------------------------------------------

    if hostname:

        local_hostname = hostname + ".local"

        try:
            # Try to resolve the .local hostname.
            #
            # If the operating system has working mDNS
            # support (Bonjour, Avahi, etc.), this should
            # return an address.
            socket.gethostbyname(local_hostname)

            # .local address works, so use it.
            return local_hostname, local_ip

        except (socket.gaierror, OSError):
            pass

    # -----------------------------------------------------
    # Fallback to IP address
    # -----------------------------------------------------

    return local_ip, local_ip


# ---------------------------------------------------------
# Determine network address
# ---------------------------------------------------------

NETWORK_HOST, LOCAL_IP = fn_get_local_network_address()

NETWORK_URL = f"http://{NETWORK_HOST}:{SERVER_PORT}"

# insert it into the webpages
@app.context_processor
def fn_inject_network_url():
    return {
        "network_url": NETWORK_URL
    }

print()
print("--------------------------------------------------")
print("LiCo: The Linotype Computer Connection")
print("--------------------------------------------------")
print(f"Local address:   http://127.0.0.1:{SERVER_PORT}")
print(f"Network address: {NETWORK_URL}")
print("--------------------------------------------------")
print()


# ---------------------------------------------------------
# Pages
# ---------------------------------------------------------
# Flask automatically assumes that HTML/Jinja templates are in 'templates'!

@app.route("/")
def input_page():
    return render_template("index.html")


@app.route("/keyboard-options")
def keyboard_options_page():
    return render_template("keyboard_options.html")


@app.route("/typesetting-options")
def typesetting_options_page():
    return render_template("typesetting_options.html")


@app.route("/output")
def output_page():
    return render_template("output.html")


@app.route("/preview")
def preview_page():
    return render_template("preview.html")


@app.route("/progress")
def progress_page():
    return render_template("progress.html")


@app.route("/info")
def info_page():
    return render_template("info.html")


# ---------------------------------------------------------
# Input text storage
# ---------------------------------------------------------

@app.route("/api/input", methods=["GET"])
def fn_get_input():

    if not os.path.exists(INPUT_FILE):

        if os.path.exists(INPUT_FILE_BACKUP):

            with open(
                INPUT_FILE_BACKUP,
                "r",
                encoding="utf-8"
            ) as backup_file:
                text = backup_file.read()

            # Create the normal input file from the backup
            with open(
                INPUT_FILE,
                "w",
                encoding="utf-8"
            ) as file:
                file.write(text)

        else:

            # No input file and no backup:
            # create an empty input file.
            with open(
                INPUT_FILE,
                "w",
                encoding="utf-8"
            ) as file:
                pass

            text = ""

    else:

        with open(
            INPUT_FILE,
            "r",
            encoding="utf-8"
        ) as file:
            text = file.read()

    return {
        "text": text
    }


@app.route("/api/input", methods=["POST"])
def fn_save_input():

    data = request.get_json()
    text = data.get("text", "")

    with open(INPUT_FILE, "w", encoding="utf-8") as file:
        file.write(text)

    return {
        "success": True
    }


# ---------------------------------------------------------
# Keyboard values storage
# ---------------------------------------------------------

@app.route("/api/keyboard", methods=["GET"])
def fn_get_keyboard():

    if os.path.exists(KEYBOARD_FILE):

        with open(KEYBOARD_FILE, "r", encoding="utf-8") as file:
            keyboard_data = json.load(file)

    else:

        keyboard_data = {}

    return keyboard_data


@app.route("/api/keyboard", methods=["POST"])
def fn_save_keyboard():

    keyboard_data = request.get_json()

    with open(KEYBOARD_FILE, "w", encoding="utf-8") as file:
        json.dump(
            keyboard_data,
            file,
            ensure_ascii=False,
            indent=4
        )

    return {
        "success": True
    }


# ---------------------------------------------------------
# Typesetting options storage
# ---------------------------------------------------------

@app.route("/api/typesetting", methods=["GET"])
def fn_get_typesetting():

    if os.path.exists(TYPESETTING_FILE):

        with open(TYPESETTING_FILE, "r", encoding="utf-8") as file:
            typesetting_data = json.load(file)

    else:

        typesetting_data = {
            "line_length": 8.0,
            "wedge_space_addition": "nothing",
            "wedge_space_minimum": 1.0,
            "wedge_space_maximum": 2.5
        }

    return typesetting_data


@app.route("/api/typesetting", methods=["POST"])
def fn_save_typesetting():

    typesetting_data = request.get_json()

    with open(TYPESETTING_FILE, "w", encoding="utf-8") as file:
        json.dump(
            typesetting_data,
            file,
            ensure_ascii=False,
            indent=4
        )

    return {
        "success": True
    }













# ---------------------------------------------------------
# Create a .linotype file based on the provided input
# ---------------------------------------------------------

def fn_generate_linotype_file():
    """
    Process input.txt into Linotype key-number instructions.

    The result is stored in processed_text.linotype and returned as text.
    Errors are stored in processing_input_errors.txt.
    """

    # ---------------------------------------------------------
    # Start with basic info
    # ---------------------------------------------------------

    # Remember the coordinates of this specific character (for edits later)
    char_x = 0
    char_y = 1
    line_min_length = 0
    line_max_length = 0
    line_number_of_wedge_spaces = 0
    line_previous_character = ""


    SPACE_CHARACTERS = {
        " ",        # SPACE
        "\u00A0",   # NO-BREAK SPACE
        "\u202F",   # NARROW NO-BREAK SPACE
        "\u2007",   # FIGURE SPACE
        "\u2009",   # THIN SPACE
        "\u200A",   # HAIR SPACE
        "\u2002",   # EN SPACE
        "\u2003",   # EM SPACE
        "\u2004",   # THREE-PER-EM SPACE
        "\u2005",   # FOUR-PER-EM SPACE
        "\u2006",   # SIX-PER-EM SPACE
        "\u2008",   # PUNCTUATION SPACE
        "\u205F",   # MEDIUM MATHEMATICAL SPACE
    }

    # --------------------------------------------------
    # Function: format numbers
    # --------------------------------------------------

    def fn_format_length(value):
        return f"{value:.6f}".rstrip("0").rstrip(".")

    
    # ---------------------------------------------------------
    # Function: log errors
    # ---------------------------------------------------------

    def fn_log_error(message):
        
        nonlocal char_x
        nonlocal char_y

        with open(
            PROCESSING_ERROR_FILE,
            "a",
            encoding="utf-8"
        ) as file:

            file.write(f"Line {{{char_y}, {char_x}}}: [{message}]\n")


    # ---------------------------------------------------------
    # 1. Read input.txt
    # ---------------------------------------------------------

    with open(INPUT_FILE, "r", encoding="utf-8") as file:
        input_text = file.read()


    # ---------------------------------------------------------
    # 2. Read typesetting.json
    # ---------------------------------------------------------

    with open(TYPESETTING_FILE, "r", encoding="utf-8") as file:
        typesetting_data = json.load(file)

    units_used = typesetting_data.get(
        "units_used",
        "mm"
    )

    set_line_length = float(
        typesetting_data.get("line_length", "8.0")
    )

    wedge_space_addition = typesetting_data.get(
        "wedge_space_addition",
        "nothing"
    )

    wedge_space_minimum = float(
        typesetting_data.get(
            "wedge_space_minimum",
            "1.0"
        )
    )

    wedge_space_maximum = float(
        typesetting_data.get(
            "wedge_space_maximum",
            "2.5"
        )
    )


    # ---------------------------------------------------------
    # 3. Load keyboard.json
    # ---------------------------------------------------------

    KEYBOARD_FILE = os.path.join(
        "data",
        "keyboard.json"
    )

    with open(KEYBOARD_FILE, "r", encoding="utf-8") as file:
        keyboard_data = json.load(file)

    # Create a fast lookup table.
    #
    # Each glyph points to:
    # {
    #     "key": key number,
    #     "width": width in mm
    # }

    keyboard_table = {}

    for key in range(1, 129):

        glyph_key = f"{key}_glyph"
        width_key = f"{key}_width"

        glyph = keyboard_data.get(glyph_key, "")
        width = keyboard_data.get(width_key, "")

        if glyph == "":
            continue

        try:
            width = float(width)
        except (TypeError, ValueError):
            continue

        keyboard_table[glyph] = {
            "key": key,
            "width": width
        }


    # ---------------------------------------------------------
    # Function: find special wedge-space keys
    # ---------------------------------------------------------

    thin_space = keyboard_table.get("thin space")
    en_space = keyboard_table.get("en space")
    em_space = keyboard_table.get("em space")


    # ---------------------------------------------------------
    # Function: find selected wedge-space key
    # ---------------------------------------------------------

    selected_wedge = None

    if wedge_space_addition != "nothing":

        selected_wedge = keyboard_table.get(
            wedge_space_addition
        )


    # ---------------------------------------------------------
    # 4. Empty the errors file
    # ---------------------------------------------------------

    with open(PROCESSING_ERROR_FILE, "w", encoding="utf-8") as file:
        pass


    # ---------------------------------------------------------
    # 5. Create empty content for the .linotype file
    # ---------------------------------------------------------

    linotype_file_contents = ""

    # Add the first content
    linotype_file_contents = (
        "# Linotype text\n"
        "# Format version: 1\n"
        "# Generated by: LiCo, the Linotype Computer Connection\n"
        f"# All units in {units_used}\n"
        f"# Line length: {set_line_length} {units_used}\n"
        f"# Wedge space thickness: {wedge_space_minimum}-{wedge_space_maximum} {units_used}\n"
        "\n"
    )


    # ---------------------------------------------------------
    # Function: start a new line
    # ---------------------------------------------------------

    def fn_start_new_line():

        # The next line should start with a min and max length of zero
        return 0.0, 0.0


    # ---------------------------------------------------------
    # Function: add an instruction
    # ---------------------------------------------------------
    
    def fn_add_instruction(
        name,
        key_number,
        char_width,
        metadata
    ):
        
        nonlocal linotype_file_contents
        nonlocal char_x
        nonlocal char_y
        nonlocal line_min_length
        nonlocal line_max_length
        nonlocal line_previous_character

        # Move to the next character position
        char_x += 1

        if char_width is None:
            width_text = "{}"
        else:
            width_text = f"{char_width}"

        linotype_file_contents += (
            f"key {{{char_y}, {char_x}}} "
            f"{{{name}}} {{{key_number}}} "
            f"{{{width_text}}} {metadata}\n"
        )

        line_previous_character = name

    # ---------------------------------------------------------
    # Function: insert a wedge space
    # ---------------------------------------------------------

    def fn_insert_wedge_space():

        nonlocal line_min_length
        nonlocal line_max_length
        nonlocal line_number_of_wedge_spaces

        space_was_replaced_by_line_ending = False

        # First, check whether the line is now full
        # If the line is full, finish the line and don't send a space.
            
        if fn_line_can_be_sent():

            fn_finish_line()

            space_was_replaced_by_line_ending = True

        else:

            # Don't add a wedge space if it is the first character on the line

            if (line_previous_character == "wedge_space"):

                fn_log_error(
                    "We found two wedge spaces next to each other. This is not advised for the correct working of the machine. The second wedge space was deleted."
                )

            if char_x != 0 and line_previous_character != "wedge_space":

                # Key 129 = wedge space
                fn_add_instruction(
                    "wedge_space",
                    129,
                    None,
                    "[orig:auto]"
                )

                line_min_length += wedge_space_minimum
                line_max_length += wedge_space_maximum


                # Optional selected wedge-space additional key
                if wedge_space_addition != "nothing":

                    if selected_wedge is not None:

                        fn_add_instruction(
                            wedge_space_addition,
                            selected_wedge["key"],
                            selected_wedge["width"],
                            "[orig:auto]"
                        )

                        line_min_length += selected_wedge["width"]
                        line_max_length += selected_wedge["width"]

                    else:

                        fn_log_error(
                            f"Wedge space '{wedge_space_addition}' "
                            f"not found in keyboard"
                        )

                line_number_of_wedge_spaces += 1

        return (
            space_was_replaced_by_line_ending
        )


    # ---------------------------------------------------------
    # Function: check whether a line can be sent
    # ---------------------------------------------------------

    def fn_line_can_be_sent():

        nonlocal line_min_length
        nonlocal line_max_length

        # Case: line is already too long.
        # Return true, because we don't want to make the line any longer!
        if line_min_length > set_line_length:

            # Consider this a serious error, because this can block the machine!
            fn_log_error(
                f"Line is too long: "
                f"{line_min_length}-{line_max_length} "
                f"(target {set_line_length})"
            )

            return True

        # Case: target length is within the possible range.
        # Returns either True or False
        # The function asks: Is the target set_line_length somewhere between the current minimum possible line length and the current maximum possible line length?
        return (
            line_min_length <= set_line_length
            and
            set_line_length <= line_max_length
        )


    # ---------------------------------------------------------
    # Function: finish a Linotype line
    # ---------------------------------------------------------

    def fn_finish_line():

        nonlocal char_x
        nonlocal char_y
        nonlocal line_min_length
        nonlocal line_max_length
        nonlocal line_number_of_wedge_spaces
        nonlocal line_previous_character

        # Check if there are enough spaces in this line, and if not, notify the user.
        # This is not an error for the app, but the Linotype requires enough spaces to cast
        if line_number_of_wedge_spaces < 3:
            fn_log_error(
                "Not enough spaces! "
                "The Linotype requires at least three wedge spaces per line to function properly."
            )

        line_min_length = fn_format_length(line_min_length)
        line_max_length = fn_format_length(line_max_length)

        # Key 130 = line ending
        fn_add_instruction(
            "line_ending",
            "130",
            "",
            f"[line_min_length:{line_min_length}] "
            f"[line_max_length:{line_max_length}] "
            f"[set_line_length:{set_line_length}] "
            f"[orig:auto]\n"
        )

        # Reset the coordinates for the next line
        char_x = 0
        char_y += 1
        line_min_length = 0
        line_max_length = 0
        line_number_of_wedge_spaces = 0
        line_previous_character = ""
        
        return fn_start_new_line()


    # ---------------------------------------------------------
    # Function: check whether the next character will exceed the line length
    # ---------------------------------------------------------

    def fn_check_character_width_in_line(char_width):

        nonlocal line_min_length
        nonlocal line_max_length

        # If the line would become too long, add a line ending
        if line_min_length + char_width > set_line_length:

            fn_finish_line()

            return True

        else:

            return False


    # ---------------------------------------------------------
    # Function: add spacing to finish a line
    # ---------------------------------------------------------

    def fn_fill_line_with_spaces():

        nonlocal line_min_length
        nonlocal line_max_length

        # First, insert a normal space
        # This immediately checks if the space should be replaced with a line ending
        (
            space_was_replaced_by_line_ending
        ) = fn_insert_wedge_space()

        # Maximum number of spacing attempts.
        number_of_runs = 0
        maximum_runs = 150

        if space_was_replaced_by_line_ending is True:

            return

        else:

            while number_of_runs < maximum_runs:

                number_of_runs += 1

                # -------------------------------------------------
                # Try thin space
                # -------------------------------------------------
                
                if thin_space is not None:

                    if not fn_check_character_width_in_line(thin_space["width"]):

                        fn_add_instruction(
                            "thin space",
                            thin_space["key"],
                            thin_space["width"],
                            "[orig:auto]"
                        )

                        line_min_length += thin_space["width"]
                        line_max_length += thin_space["width"]

                        # Continue with another wedge space (or a new line if needed)
                        
                        (
                            space_was_replaced_by_line_ending
                        ) = fn_insert_wedge_space()

                        if space_was_replaced_by_line_ending is True:

                            return

                # -------------------------------------------------
                # Try en space
                # -------------------------------------------------

                if en_space is not None:

                    if not fn_check_character_width_in_line(en_space["width"]):

                        fn_add_instruction(
                            "en space",
                            en_space["key"],
                            en_space["width"],
                            "[orig:auto]"
                        )

                        line_min_length += en_space["width"]
                        line_max_length += en_space["width"]

                        # Continue with another wedge space (or a new line if needed)
                        
                        (
                            space_was_replaced_by_line_ending
                        ) = fn_insert_wedge_space()

                        if space_was_replaced_by_line_ending is True:

                            return

                # -------------------------------------------------
                # Try em space
                # -------------------------------------------------

                if em_space is not None:

                    if not fn_check_character_width_in_line(em_space["width"]):

                        fn_add_instruction(
                            "em space",
                            em_space["key"],
                            em_space["width"],
                            "[orig:auto]"
                        )

                        line_min_length += em_space["width"]
                        line_max_length += em_space["width"]

                        # Continue with another wedge space (or a new line if needed)
                        
                        (
                            space_was_replaced_by_line_ending
                        ) = fn_insert_wedge_space()

                        if space_was_replaced_by_line_ending is True:

                            return


        # Check the outcome after the while
        if space_was_replaced_by_line_ending is False:

            nonlocal char_x
            nonlocal char_y
            
            # Could not reach the required line length
            fn_log_error(
                f"{{{char_y}, {char_x}}} Could not fill line to required length after 150 spacing attempts."
            )

            return













    # ---------------------------------------------------------
    # 6. Start first Linotype line
    # ---------------------------------------------------------

    line_min_length, line_max_length = (
        fn_start_new_line()
    )

    
    # ---------------------------------------------------------
    # 7. Process character by character
    # ---------------------------------------------------------

    for character in input_text:

        # -----------------------------------------------------
        # 9. Check for all kind of spaces
        # -----------------------------------------------------

        if character in SPACE_CHARACTERS:

            (
                space_was_replaced_by_line_ending
            ) = fn_insert_wedge_space()


        # -----------------------------------------------------
        # 10. Process enter / newline
        # -----------------------------------------------------

        elif character in ("\n", "\r"):

            # A Windows newline consists of two characters:
            # \r   ← carriage return
            # \n   ← line feed
            # Without a continue, the app could interpret this as two separate line endings.
            if character == "\r":
                continue


            # First check whether the line is already full

            if fn_line_can_be_sent():

                line_min_length, line_max_length = (
                    fn_finish_line()
                )

            else:

                # Fill the line with additional spaces until
                # it reaches the required length.

                fn_fill_line_with_spaces()

            continue


        # -----------------------------------------------------
        # 13. Process normal characters
        # -----------------------------------------------------

        else:
        
            keyboard_character = keyboard_table.get(
                character
            )

            if keyboard_character is None:

                fn_log_error(
                    f"Character not found: {character!r}"
                )

                continue


            key_number = keyboard_character["key"]
            char_width = keyboard_character["width"]

            # Check if the character width would go over the set line length
            fn_check_character_width_in_line(char_width)

            # Add character
            fn_add_instruction(
                character,
                key_number,
                char_width,
                "[orig:auto]"
            )

            line_min_length += char_width
            line_max_length += char_width

            # Check whether the line is now full

            if fn_line_can_be_sent():

                fn_finish_line()


    # ---------------------------------------------------------
    # 17. Finish final incomplete line
    # ---------------------------------------------------------

    # Normally, this is always done, but check if needed:
    if line_min_length > 0:

        if fn_line_can_be_sent():

            # If it can be send, finish it
            fn_finish_line()

        else:

            # if it cannot be send yet, fill in the line:
            fn_fill_line_with_spaces()
            # We assume that this succeeds. If not, there is an error report in the logs


    # ---------------------------------------------------------
    # 18. Save processed result
    # ---------------------------------------------------------

    with open(
        PROCESSING_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(
            linotype_file_contents
        )

    return linotype_file_contents



# ---------------------------------------------------------
# Process the input into a .linotype
# ---------------------------------------------------------

@app.route("/api/processing_input", methods=["GET"])
def process_input():

    # First, generate the contents of a .linotype file
    try:

        result_based_upon_input = fn_generate_linotype_file()
        

    except Exception as error:

        print(
            f"Processing error: {error}"
        )

        return {
            "success": False,
            "error": str(error)
        }, 500


    # Then, return the processed input to the user
    # start the return with "processing", which is a JSON wrapper (which JSON interprets more easily)
    if result_based_upon_input:
        return {
            "processing": result_based_upon_input
        }

    return {
        "processing": "# no input was processed!"
    }


# ---------------------------------------------------------
# Return the .linotype file to the user
# ---------------------------------------------------------

@app.route("/api/preview", methods=["GET"])
def preview():

    linotype_file = os.path.join(
        app.root_path,
        "data",
        "processed_text.linotype"
    )

    try:

        with open(linotype_file, "r", encoding="utf-8") as file:
            contents = file.read()

    except FileNotFoundError:

        return {
            "processing": "# no .linotype file was generated!"
        }

    except Exception as error:

        print(
            f"Error reading .linotype file: {error}"
        )

        return {
            "success": False,
            "error": str(error)
        }, 500


    # -----------------------------------------------------
    # Return the contents to the user
    # -----------------------------------------------------

    return {
        "processing": contents
    }













# ---------------------------------------------------------
# Return processing errors
# ---------------------------------------------------------

@app.route("/api/processing_errors", methods=["GET"])
def get_errors():

    if os.path.exists(PROCESSING_ERROR_FILE):
        with open(PROCESSING_ERROR_FILE, "r", encoding="utf-8") as file:
            processing_errors = file.read()
    else:
        processing_errors = ""

    return {"errors": processing_errors}


# ---------------------------------------------------------
# Start casting
# ---------------------------------------------------------

@app.route("/api/casting_start", methods=["POST"])
def start_casting():

    tracking_text = (
        "Start casting.\n"
        "No device is attached / this functionality is not yet built."
    )

    # Create the file if it does not exist
    # and empty it before writing the new status.
    with open(
        CASTING_TRACKING_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(tracking_text)

    return {
        "success": True
    }


# ---------------------------------------------------------
# Return casting information
# ---------------------------------------------------------

@app.route("/api/casting_tracking", methods=["GET"])
def get_casting_tracking():

    # Create the file if it does not exist
    if not os.path.exists(CASTING_TRACKING_FILE):

        with open(
            CASTING_TRACKING_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            pass


    # Read the tracking information
    with open(
        CASTING_TRACKING_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        tracking_data = file.read()


    # Return the contents as plain text
    return tracking_data


# ---------------------------------------------------------
# Stop casting
# ---------------------------------------------------------

@app.route("/api/casting_stop", methods=["POST"])
def stop_casting():

    with open(
        CASTING_TRACKING_FILE,
        "a",
        encoding="utf-8"
    ) as file:

        file.write(
            "\nCasting has been stopped by the user\n"
        )

    return {
        "success": True
    }


# ---------------------------------------------------------
# Start application
# ---------------------------------------------------------

if __name__ == "__main__":

    threading.Timer(
        1.0,
        lambda: webbrowser.open_new(
            f"http://127.0.0.1:{SERVER_PORT}"
        )
    ).start()

    app.run(
        host="0.0.0.0",
        port=SERVER_PORT,
        debug=False,
        use_reloader=False
    )

