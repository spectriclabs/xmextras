from datetime import datetime

import pytest

import xmextras.noxm

def test_j1950():
    t = 1716925213.0
    assert t == xmextras.noxm.j1950_to_epoch(
        xmextras.noxm.epoch_to_j1950(t)
    )

    assert datetime.fromtimestamp(t) == xmextras.noxm.j1950_to_datetime(
        xmextras.noxm.epoch_to_j1950(t)
    )
