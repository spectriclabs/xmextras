from contextlib import contextmanager

from xmstart import XMSession  # pylint: disable=import-error

@contextmanager
def XMSessionContext():
    session = XMSession()
    session.start()

    try:
        yield session
    finally:
        session.end()
