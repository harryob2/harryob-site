from flask import Flask, render_template, send_from_directory

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/advice/')
def advice():
    return render_template('advice.html')

@app.route('/apps/')
def apps():
    return render_template('apps.html')

@app.route('/cv/')
def cv():
    return render_template('cv.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
