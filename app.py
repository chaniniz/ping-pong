from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import os

app = Flask(__name__)
app.secret_key = 'supersecret'

USERS_FILE = 'users.json'

if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump({}, f)


def load_users():
    with open(USERS_FILE) as f:
        return json.load(f)


def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)


@app.route('/')
def index():
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        if not username:
            return render_template('login.html', error='Username required')
        users = load_users()
        stage = users.get(username, 1)
        session['username'] = username
        session['stage'] = stage
        return redirect(url_for('game'))
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/game')
def game():
    stage = session.get('stage', 1)
    return render_template('game.html', stage=stage, logged_in='username' in session)


@app.route('/save_stage', methods=['POST'])
def save_stage():
    if 'username' in session:
        new_stage = int(request.json.get('stage', 1))
        session['stage'] = new_stage
        users = load_users()
        users[session['username']] = new_stage
        save_users(users)
        return jsonify({'status': 'saved'})
    return jsonify({'status': 'ignored'})


if __name__ == '__main__':
    app.run(debug=True)
