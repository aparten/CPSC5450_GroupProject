from .worker import app

@app.task
def ping(x: int) -> int:
    """
    Simple task for testing purposes.
    """
    return x
