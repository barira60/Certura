from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# SQLite database configuration
DB_PATH = 'blog.db'

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Create posts table if it doesn't exist
    c.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Get a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    return conn

# Initialize database when app starts
init_db()

# API route to get all posts
@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        conn = get_db_connection()
        posts = conn.execute('SELECT * FROM posts ORDER BY date DESC').fetchall()
        conn.close()
        
        # Convert rows to dictionaries
        posts_list = [dict(post) for post in posts]
        return jsonify(posts_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to get a specific post
@app.route('/api/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    try:
        conn = get_db_connection()
        post = conn.execute('SELECT * FROM posts WHERE id = ?', (post_id,)).fetchone()
        conn.close()
        
        if post is None:
            return jsonify({'error': 'Post not found'}), 404
            
        return jsonify(dict(post))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to create a new post
@app.route('/api/posts', methods=['POST'])
def create_post():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('content'):
            return jsonify({'error': 'Title and content are required'}), 400
        
        # Insert new post
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO posts (title, content, date) VALUES (?, ?, ?)',
            (data['title'], data['content'], datetime.now().isoformat())
        )
        conn.commit()
        
        # Get the inserted post
        new_post = conn.execute(
            'SELECT * FROM posts WHERE id = ?', 
            (cursor.lastrowid,)
        ).fetchone()
        conn.close()
        
        return jsonify(dict(new_post)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to update a post
@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('content'):
            return jsonify({'error': 'Title and content are required'}), 400
        
        conn = get_db_connection()
        
        # Check if post exists
        existing_post = conn.execute(
            'SELECT * FROM posts WHERE id = ?', 
            (post_id,)
        ).fetchone()
        
        if existing_post is None:
            conn.close()
            return jsonify({'error': 'Post not found'}), 404
        
        # Update the post
        conn.execute(
            'UPDATE posts SET title = ?, content = ? WHERE id = ?',
            (data['title'], data['content'], post_id)
        )
        conn.commit()
        
        # Get the updated post
        updated_post = conn.execute(
            'SELECT * FROM posts WHERE id = ?', 
            (post_id,)
        ).fetchone()
        conn.close()
        
        return jsonify(dict(updated_post))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API route to delete a post
@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        conn = get_db_connection()
        
        # Check if post exists
        existing_post = conn.execute(
            'SELECT * FROM posts WHERE id = ?', 
            (post_id,)
        ).fetchone()
        
        if existing_post is None:
            conn.close()
            return jsonify({'error': 'Post not found'}), 404
        
        # Delete the post
        conn.execute('DELETE FROM posts WHERE id = ?', (post_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Post deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve the frontend from the root URL
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Serve static files if needed
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)