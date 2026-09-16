APP_NAME = "LiCo"
APP_DESCRIPTION = "Linotype Computer Connection"
APP_VERSION = "1.0.2"

import os
from datetime import timedelta

UPDATE_CACHE_FILE = os.path.join(
    "data",
    "update_cache.json"
)

UPDATE_CHECK_INTERVAL = timedelta(hours=48)

GITHUB_RELEASES_URL = (
    "https://api.github.com/repos/"
    "maartenrenckens/lico/releases/latest"
)

"""
2026_09_16: 1.0.2 Lots of overal refinements
2026_09_16: 1.0.1 Installation of the update mechanism
2026_09_16: 1.0.0 First stable release
"""
