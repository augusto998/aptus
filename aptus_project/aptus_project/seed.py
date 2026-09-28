import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from app import create_app
from app.models import db, User, UserProfile, Nutritionist, Post, Comment, Like, Recipe, Follow, Consultation, Message

load_dotenv()
app = create_app()

with app.app_context():
    db.create_all()
    # Idempotent demo seed: do nothing when demo data already exists.
    if User.query.filter_by(username="lucas").first():
        print("Demo data already exists.")
        raise SystemExit(0)

    password = os.getenv("APTUS_DEMO_PASSWORD", "Aptus@123")
    lucas = User(username="lucas", email="lucas@aptus.local", password_hash=generate_password_hash(password), role="user")
    marina_u = User(username="marina.nutri", email="marina@aptus.local", password_hash=generate_password_hash(password), role="nutritionist")
    bia = User(username="bia", email="bia@aptus.local", password_hash=generate_password_hash(password), role="user")
    db.session.add_all([lucas, marina_u, bia]); db.session.flush()
    db.session.add_all([
        UserProfile(user_id=lucas.id, display_name="Lucas Almeida", bio="Buscando uma rotina mais leve e sustentável.", goal="Ter mais constância nas refeições"),
        UserProfile(user_id=marina_u.id, display_name="Marina Costa", bio="Nutricionista focada em educação alimentar e acompanhamento individual.", goal="Ajudar pessoas a criar hábitos sustentáveis"),
        UserProfile(user_id=bia.id, display_name="Bia Santos", bio="Receitas simples para a rotina.", goal="Experimentar mais comida de verdade"),
    ])
    n = Nutritionist(user_id=marina_u.id, professional_registration="CRN-DEMO-12345", specialty="Nutrição clínica e educação alimentar", about="Atendimento baseado em educação nutricional, rotina e metas possíveis.", verified=True)
    db.session.add(n)
    db.session.flush()

    p1 = Post(author_id=marina_u.id, caption="Um prato colorido não precisa ser complicado. Comece com o que você já gosta e inclua um vegetal a mais.", media_url="", media_type="image")
    p2 = Post(author_id=lucas.id, caption="Hoje eu testei uma receita de overnight oats para deixar o café da manhã pronto.", media_url="", media_type="image")
    p3 = Post(author_id=bia.id, caption="Curiosidade: variar frutas e fontes de fibras ao longo da semana pode deixar a rotina alimentar mais interessante.", media_url="", media_type="image")
    db.session.add_all([p1,p2,p3]); db.session.flush()
    db.session.add(Recipe(post_id=p2.id, title="Overnight oats de banana", ingredients="Aveia; leite ou bebida vegetal; banana; canela; iogurte.", instructions="Misture, deixe na geladeira durante a noite e finalize com banana e canela.", prep_minutes=5))
    db.session.add_all([
        Comment(post_id=p1.id, author_id=lucas.id, body="Gostei da ideia de começar pequeno."),
        Comment(post_id=p2.id, author_id=bia.id, body="Vou testar também!"),
        Like(post_id=p1.id, user_id=lucas.id), Like(post_id=p2.id, user_id=bia.id), Like(post_id=p2.id, user_id=marina_u.id),
        Follow(follower_id=lucas.id, following_id=marina_u.id),
    ])
    consultation = Consultation(user_id=lucas.id, nutritionist_id=n.id, status="requested", notes="Quero conversar sobre uma rotina que eu consiga manter na semana.")
    db.session.add(consultation); db.session.flush()
    db.session.add(Message(sender_id=lucas.id, receiver_id=marina_u.id, consultation_id=consultation.id, body="Olá, Marina! Gostaria de entender como funciona o acompanhamento."))
    db.session.add(Message(sender_id=marina_u.id, receiver_id=lucas.id, consultation_id=consultation.id, body="Olá! Podemos começar entendendo sua rotina e seus objetivos."))
    db.session.commit()
    print("Seed completed.")
    print("User login: lucas /", password)
    print("Nutritionist login: marina.nutri /", password)
