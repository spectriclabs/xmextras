import pytest

import xmextras.mcrlint

def test_check_line(tmp_path):
    bad_macro_path = tmp_path / 'bad_macro.txt'

    with bad_macro_path.open('w') as out:
        out.write(' ' * 201)
        out.write('\n')
        out.write('  do_thing  ! TODO: make do thing\n')
        out.write('\tdo_other_thing\n')
        out.write('  sloppy  ! FIXME   \n')

    issues = list(xmextras.mcrlint.check_file(bad_macro_path, xmextras.mcrlint.get_active_plugins('')))
    assert len(issues) == 6

    issues = list(xmextras.mcrlint.check_file(bad_macro_path, xmextras.mcrlint.get_active_plugins('fixme')))
    assert len(issues) == 4
