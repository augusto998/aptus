import pytest
from app import create_app
from app.models import db, User, UserProfile, Post, Nutritionist

@pytest.fixture()
def app():
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "test",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    with app.app_context():
        db.create_all()
        user = User(username="user", email="user@test", password_hash="not-used", role="user")
        nutritionist_user = User(username="nutri", email="nutri@test", password_hash="not-used", role="nutritionist")
        db.session.add_all([user, nutritionist_user]); db.session.flush()
        db.session.add_all([UserProfile(user_id=user.id, display_name="Test User"), UserProfile(user_id=nutritionist_user.id, display_name="Test Nutri")])
        db.session.add(Nutritionist(user_id=nutritionist_user.id, professional_registration="CRN-1"))
        db.session.commit()
    yield app

@pytest.fixture()
def client(app):
    return app.test_client()

def test_exactly_ten_tables(app):
    with app.app_context():
        assert len(db.metadata.tables) == 10

def test_home_requires_login(client):
    response = client.get("/home")
    assert response.status_code == 302

def test_login_flow(app, client):
    from werkzeug.security import generate_password_hash
    with app.app_context():
        u = User.query.filter_by(username="user").first()
        u.password_hash = generate_password_hash("secret123")
        db.session.commit()
    response = client.post("/login/user", data={"identity":"user", "password":"secret123"})
    assert response.status_code == 302
    assert "/home" in response.headers["Location"]

def test_post_creation(app, client):
    from werkzeug.security import generate_password_hash
    with app.app_context():
        u = User.query.filter_by(username="user").first(); u.password_hash=generate_password_hash("secret123"); db.session.commit()
    client.post("/login/user", data={"identity":"user", "password":"secret123"})
    response = client.post("/post/create", data={"caption":"Minha primeira publicação"})
    assert response.status_code == 302
    with app.app_context():
        assert Post.query.count() == 1
