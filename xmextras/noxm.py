'''
Functionality that does not require X-Midas.
'''

from datetime import datetime
from math import frexp, ldexp

J1950_DELTA = 631152000.0

def j1950_to_epoch(t):
    '''
    Converts J1950 time to Unix epoch time in float seconds.
    '''
    return t - J1950_DELTA

def epoch_to_j1950(t):
    '''
    Converts Unix epoch time to J1950 time in float seconds.
    '''
    return t + J1950_DELTA


def j1950_to_datetime(t):
    '''
    Creates a datetime object from J1950 time.
    '''
    return datetime.fromtimestamp(j1950_to_epoch(t))

def datetime_to_j1950(dt):
    '''
    Returns the J1950 time from a datetime object.
    '''
    return epoch_to_j1950(dt.timestamp())

def power2(x):
    '''
    Returns the next power of two greater than
    or equal to x.
    '''
    if x <= 1:
        return 1

    fraction, exponent = frexp(x)
    return int(ldexp(1, exponent - (fraction == 0.5)))
