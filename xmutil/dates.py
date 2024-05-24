J1950_DELTA = 631152000.0

def j1950_to_epoch(t):
    return t - J1950_DELTA

def epoch_to_j1950(t):
    return t + J1950_DELTA
