import os
import sys

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Dash app and set the WSGI application
from app import server as application
