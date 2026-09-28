import os
from flask import Flask
from dotenv import load_dotenv
from .models import db

load_dotenv()

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "postgresql+psycopg://aptus:aptus@localhost:5432/aptus"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    if test_config:
        app.config.update(test_config)
    db.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    from .models import User, Post, Like, Comment, Recipe
    @app.template_filter("like_count")
    def like_count(post_id):
        return Like.query.filter_by(post_id=post_id).count()
    @app.template_filter("comment_count")
    def comment_count(post_id):
        return Comment.query.filter_by(post_id=post_id).count()
    @app.template_filter("comments_for_post")
    def comments_for_post(post_id):
        return Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).limit(4).all()
    @app.template_filter("user_name")
    def user_name(user_id):
        u = db.session.get(User, user_id)
        return (u.username if u else "Usuário")
    @app.template_filter("recipe_exists")
    def recipe_exists(post_id):
        return Recipe.query.filter_by(post_id=post_id).first() is not None
    @app.template_filter("recipe_for")
    def recipe_for(post_id):
        return Recipe.query.filter_by(post_id=post_id).first()
    @app.context_processor
    def db_helpers():
        def db_session_user(user_id):
            return db.session.get(User, user_id)
        def db_session_user_name(user_id):
            u = db.session.get(User, user_id)
            return u.username if u else "Usuário"
        def db_session_user_initial(user_id):
            u = db.session.get(User, user_id)
            return u.username[:1].upper() if u else "U"
        return {"db_session_user": db_session_user, "db_session_user_name": db_session_user_name, "db_session_user_initial": db_session_user_initial}

    @app.cli.command("init-db")
    def init_db():
        with app.app_context():
            db.create_all()
            print("APTUS database initialized with exactly 10 tables.")

    return app
