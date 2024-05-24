# pylint: disable=wrong-import-position

import os
import sys

XM_PATH = os.path.join(os.environ['XMDISK'], 'xm', 'pylib')

if XM_PATH not in sys.path:
    sys.path.append(XM_PATH)

import bluefile  # pylint: disable=import-error

from .dates import (
    j1950_to_epoch,
    epoch_to_j1950,
)
from .info import xm_info
from .xmsessioncontext import XMSessionContext
