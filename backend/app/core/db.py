from collections.abc import Generator

from sqlmodel import SQLModel, Session, create_engine

from app.core.config import settings


engine = create_engine(
    str(settings.POSTGRES_DSN),
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
)


def init_db() -> None:
    # Import the models package so SQLModel table classes can register metadata.
    import app.models.user  # noqa: F401
    import app.models.email
    import app.models.audit
    from app import crud
    from app.models.user import UserCreate

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        admin_user = crud.get_user_by_email(
            session=session, email=str(settings.FIRST_SUPERUSER_EMAIL)
        )
        if admin_user is None:
            crud.create_user(
                session=session,
                user_create=UserCreate(
                    email=settings.FIRST_SUPERUSER_EMAIL,
                    password=settings.FIRST_SUPERUSER_PASSWORD,
                    full_name=settings.FIRST_SUPERUSER_FULL_NAME,
                    is_superuser=True,
                    is_active=True,
                ),
            )


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
