from contextlib import contextmanager

import os
import sys

sys.path.append(os.path.join(os.environ['XMDISK'], 'xm', 'pylib'))

from xmstart import XMSession

@contextmanager
def XMSessionContext():
    session = XMSession()
    session.start()

    try:
        yield session
    finally:
        session.end()
