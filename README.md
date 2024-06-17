# xmextras

Extra helper functionality for X-Midas.

## XMSessionContext

Wraps an `XMSession` in with a context manager to ensure it gets ended correctly when exiting.

```python
import xmextras as xmx

with xmx.XMSessionContext() as session:
    session.xm('res answer 42')

    # or
    from pymidas.xmidas import xm
    xm.res('answer', 42)

    answer = session.xmpy.res['answer']
```

## info

Returns a dictionary of information about the X-Midas instance, which can be useful for tagging metrics and benchmarks for comparison.

```python
import xmextras as xmx

with xmx.XMSessionContext() as session:
    info = xmx.info(session)  # also works with a normal XMSession instance
```

## J1950

Conversion functions for dealing with J1950 times (seconds since January 1, 1950).

```python
dt = j1950_to_datetime(2191001400.0)
```

```python
j = datetime_to_j1950(dt)
```

```python
e = j1950_to_epoch(2191001400.0)
```

```python
j = epoch_to_to_j1950(1559849400.0)
```

## bluefile

xmextras locates the system installation of bluefile.py so it can be imported outside of an X-Midas environment.

```python
from xmextras import bluefile
header = bluefile.readheader('some_bluefile.tmp')
```

## mcrlint

The `mcrlint` command is also included as part of xmextras.  It can be used for linting X-Midas macro code.  Use `mcrlint --help` for more information.
