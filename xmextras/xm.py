# pylint: disable=wrong-import-order,wrong-import-position

from contextlib import contextmanager

import os
import sys

# Only define this functionality if possible
if 'XMDISK' in os.environ:
    XM_PATH = os.path.join(os.environ['XMDISK'], 'xm', 'pylib')

    if os.path.exists(XM_PATH):
        if XM_PATH not in sys.path:
            sys.path.append(XM_PATH)


        from xmstart import XMSession  # pylint: disable=import-error
        import bluefile  # pylint: disable=import-error, unused-import

        @contextmanager
        def XMSessionContext():
            '''
            XMSessionContext starts an XMSession and ensures the that the session is properly
            ended when exiting the context block.

            Example::

                with XMSessionContext() as session:
                    session.xm('res answer 42')

                    # or
                    from pymidas.xmidas import xm
                    xm.res('answer', 42)

                    answer = session.xmpy.res['answer']
            '''
            session = XMSession()
            session.start()

            try:
                yield session
            finally:
                session.end()

        def info(session):
            '''
            Returns basic info about an X-Midas instance, which can be useful
            for tagging metrics and comparison benchmarks.

            :param XMSession session: X-Midas session to use to get info
            :return: Dictionary of information

            Example::

                with XMSessionContext() as session:
                    info = info(session)
            '''
            key_mappings = {
                'version': 'XM_VERSION_CODE',
                'c_compiler': 'XM_CC',
                'cpp_compiler': 'XM_CXX',
                'fortran_compiler': 'XM_FORTRAN',
                'fft_lib': 'XM_FFTLIB',
            }

            return {name: session.environ[key] for name, key in key_mappings.items() if key in session.environ}
