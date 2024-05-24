def xm_info(session):
    key_mappings = {
        'version': 'XM_VERSION_CODE',
        'c_compiler': 'XM_CC',
        'cpp_compiler': 'XM_CXX',
        'fortran_compiler': 'XM_FORTRAN',
        'fft_lib': 'XM_FFTLIB',
    }

    return {name: session.environ[key] for name, key in key_mappings.items() if key in session.environ}
