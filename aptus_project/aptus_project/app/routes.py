from datetime import datetime
from functools import wraps
import os
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, abort
from werkzeug.security import generate_password_hash, check_password_hash
from .models import db, User, UserProfile, Nutritionist, Post, Comment, Like, Recipe, Follow, Consultation, Message

main = Blueprint("main", __name__)


def current_user():
    uid = session.get("user_id")
    return db.session.get(User, uid) if uid else None


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user():
            return redirect(url_for("main.user_login"))
        return view(*args, **kwargs)
    return wrapper


def role_required(role):
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user or user.role != role:
                abort(403)
            return view(*args, **kwargs)
        return wrapper
    return decorator


@main.context_processor
def inject_globals():
    return {"current_user": current_user()}


@main.route("/")
def index():
    if current_user():
        return redirect(url_for("main.home"))
    return render_template("landing.html")


@main.route("/login/user", methods=["GET", "POST"])
def user_login():
    if request.method == "POST":
        identity = request.form.get("identity", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter((User.email == identity) | (User.username == identity), User.role == "user").first()
        if user and check_password_hash(user.password_hash, password):
            session.clear(); session["user_id"] = user.id
            return redirect(url_for("main.home"))
        flash("Credenciais de usuário inválidas.", "error")
    return render_template("auth.html", mode="user")


@main.route("/login/nutritionist", methods=["GET", "POST"])
def nutritionist_login():
    if request.method == "POST":
        identity = request.form.get("identity", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter((User.email == identity) | (User.username == identity), User.role == "nutritionist").first()
        if user and check_password_hash(user.password_hash, password):
            session.clear(); session["user_id"] = user.id
            return redirect(url_for("main.home"))
        flash("Credenciais de nutricionista inválidas.", "error")
    return render_template("auth.html", mode="nutritionist")


@main.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        email = request.form.get("email", "").strip().lower()
        display_name = request.form.get("display_name", "").strip()
        password = request.form.get("password", "")
        if not all([username, email, display_name, password]):
            flash("Preencha todos os campos.", "error")
        elif len(password) < 6:
            flash("A senha deve ter pelo menos 6 caracteres.", "error")
        elif User.query.filter((User.email == email) | (User.username == username)).first():
            flash("Usuário ou e-mail já cadastrado.", "error")
        else:
            user = User(username=username, email=email, password_hash=generate_password_hash(password), role="user")
            db.session.add(user); db.session.flush()
            db.session.add(UserProfile(user_id=user.id, display_name=display_name))
            db.session.commit()
            flash("Conta criada! Agora faça seu login.", "success")
            return redirect(url_for("main.user_login"))
    return render_template("register.html")


@main.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.index"))


@main.route("/home")
@login_required
def home():
    user = current_user()
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    posts = Post.query.filter_by(author_id=user.id).order_by(Post.created_at.desc()).all()
    followers = Follow.query.filter_by(following_id=user.id).count()
    following = Follow.query.filter_by(follower_id=user.id).count()
    if user.role == "nutritionist":
        nutritionist = Nutritionist.query.filter_by(user_id=user.id).first()
        patient_count = Consultation.query.filter_by(nutritionist_id=nutritionist.id).distinct(Consultation.user_id).count() if nutritionist else 0
        return render_template("home.html", profile=profile, posts=posts, followers=followers, following=following, nutritionist=nutritionist, patient_count=patient_count)
    return render_template("home.html", profile=profile, posts=posts, followers=followers, following=following, nutritionist=None, patient_count=0)


@main.route("/profile/edit", methods=["POST"])
@login_required
def edit_profile():
    user = current_user()
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    profile.display_name = request.form.get("display_name", profile.display_name).strip()[:80]
    profile.bio = request.form.get("bio", "").strip()
    profile.goal = request.form.get("goal", "").strip()[:120]
    if user.role == "nutritionist":
        n = Nutritionist.query.filter_by(user_id=user.id).first()
        n.specialty = request.form.get("specialty", n.specialty).strip()[:120]
        n.about = request.form.get("about", n.about).strip()
    db.session.commit()
    flash("Perfil atualizado.", "success")
    return redirect(url_for("main.home"))


@main.route("/feed")
@login_required
def feed():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return render_template("feed.html", posts=posts)


@main.route("/post/create", methods=["POST"])
@login_required
def create_post():
    caption = request.form.get("caption", "").strip()
    media_url = request.form.get("media_url", "").strip()
    media_type = request.form.get("media_type", "image").strip()
    if not caption:
        flash("Escreva algo antes de publicar.", "error")
        return redirect(url_for("main.feed"))
    if media_type not in {"image", "video"}:
        media_type = "image"
    post = Post(author_id=current_user().id, caption=caption, media_url=media_url, media_type=media_type)
    db.session.add(post); db.session.commit()
    flash("Publicação criada.", "success")
    return redirect(url_for("main.feed"))


@main.route("/post/<int:post_id>/like", methods=["POST"])
@login_required
def like_post(post_id):
    post = db.session.get(Post, post_id) or abort(404)
    existing = Like.query.filter_by(post_id=post.id, user_id=current_user().id).first()
    if existing:
        db.session.delete(existing)
    else:
        db.session.add(Like(post_id=post.id, user_id=current_user().id))
    db.session.commit()
    return redirect(request.referrer or url_for("main.feed"))


@main.route("/post/<int:post_id>/comment", methods=["POST"])
@login_required
def comment_post(post_id):
    post = db.session.get(Post, post_id) or abort(404)
    body = request.form.get("body", "").strip()
    if body:
        db.session.add(Comment(post_id=post.id, author_id=current_user().id, body=body))
        db.session.commit()
    return redirect(request.referrer or url_for("main.feed"))


@main.route("/post/<int:post_id>/recipe", methods=["POST"])
@login_required
def add_recipe(post_id):
    post = db.session.get(Post, post_id) or abort(404)
    if post.author_id != current_user().id:
        abort(403)
    if Recipe.query.filter_by(post_id=post.id).first():
        flash("Esta publicação já possui receita.", "error")
        return redirect(url_for("main.feed"))
    recipe = Recipe(post_id=post.id, title=request.form.get("title", "Receita APTUS").strip()[:120],
                    ingredients=request.form.get("ingredients", "").strip(),
                    instructions=request.form.get("instructions", "").strip(),
                    prep_minutes=max(1, int(request.form.get("prep_minutes", "20") or 20)))
    db.session.add(recipe); db.session.commit()
    flash("Receita adicionada.", "success")
    return redirect(url_for("main.feed"))


@main.route("/social/follow/<int:user_id>", methods=["POST"])
@login_required
def follow(user_id):
    me = current_user()
    target = db.session.get(User, user_id) or abort(404)
    if me.id == target.id:
        abort(400)
    pair = Follow.query.filter_by(follower_id=me.id, following_id=target.id).first()
    if pair:
        db.session.delete(pair)
    else:
        db.session.add(Follow(follower_id=me.id, following_id=target.id))
    db.session.commit()
    return redirect(request.referrer or url_for("main.feed"))


@main.route("/nutritionist")
@login_required
def nutritionist_area():
    nutritionists = Nutritionist.query.all()
    people = []
    me = current_user()
    for n in nutritionists:
        u = db.session.get(User, n.user_id)
        if u and u.id != me.id:
            profile = UserProfile.query.filter_by(user_id=u.id).first()
            people.append((n, u, profile))
    return render_template("nutritionist_area.html", people=people)


@main.route("/consultation/request/<int:nutritionist_id>", methods=["POST"])
@role_required("user")
def request_consultation(nutritionist_id):
    n = db.session.get(Nutritionist, nutritionist_id) or abort(404)
    existing = Consultation.query.filter_by(user_id=current_user().id, nutritionist_id=n.id, status="requested").first()
    if not existing:
        db.session.add(Consultation(user_id=current_user().id, nutritionist_id=n.id, status="requested", notes=request.form.get("notes", "").strip()))
        db.session.commit()
        flash("Solicitação enviada ao nutricionista.", "success")
    else:
        flash("Você já possui uma solicitação em aberto para este nutricionista.", "error")
    return redirect(url_for("main.nutritionist_area"))


@main.route("/messages/<int:user_id>", methods=["GET", "POST"])
@login_required
def messages(user_id):
    me = current_user()
    other = db.session.get(User, user_id) or abort(404)
    if request.method == "POST":
        body = request.form.get("body", "").strip()
        if body:
            db.session.add(Message(sender_id=me.id, receiver_id=other.id, body=body))
            db.session.commit()
            return redirect(url_for("main.messages", user_id=user_id))
    chat = Message.query.filter(
        ((Message.sender_id == me.id) & (Message.receiver_id == other.id)) |
        ((Message.sender_id == other.id) & (Message.receiver_id == me.id))
    ).order_by(Message.created_at.asc()).all()
    return render_template("messages.html", other=other, chat=chat)


@main.route("/nutritionist/dashboard", methods=["GET", "POST"])
@role_required("nutritionist")
def nutritionist_dashboard():
    me = current_user()
    n = Nutritionist.query.filter_by(user_id=me.id).first()
    consultations = Consultation.query.filter_by(nutritionist_id=n.id).order_by(Consultation.id.desc()).all()
    if request.method == "POST":
        cid = int(request.form.get("consultation_id"))
        status = request.form.get("status", "requested")
        c = db.session.get(Consultation, cid) or abort(404)
        if c.nutritionist_id != n.id:
            abort(403)
        c.status = status
        scheduled = request.form.get("scheduled_at", "").strip()
        if scheduled:
            c.scheduled_at = datetime.fromisoformat(scheduled)
        db.session.commit()
        flash("Atendimento atualizado.", "success")
        return redirect(url_for("main.nutritionist_dashboard"))
    return render_template("nutritionist_dashboard.html", nutritionist=n, consultations=consultations)


@main.app_errorhandler(403)
def forbidden(_):
    return render_template("error.html", code=403, message="Você não possui permissão para acessar esta área."), 403


@main.app_errorhandler(404)
def not_found(_):
    return render_template("error.html", code=404, message="Página não encontrada."), 404
