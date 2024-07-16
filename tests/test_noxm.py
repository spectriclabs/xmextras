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

def test_power2():
    assert xmextras.noxm.power2(-3) == 1
    assert xmextras.noxm.power2(0) == 1
    assert xmextras.noxm.power2(1) == 1
    assert xmextras.noxm.power2(2) == 2
    assert xmextras.noxm.power2(3) == 4
    assert xmextras.noxm.power2(65537) == 131072
