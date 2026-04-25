# CPSC5450_GroupProject
CPSC 5450 Group Project

## Default Superuser Credentials

When the application starts for the first time, a superuser account is seeded automatically using the values in `backend/app/core/config.py` (or overridden by a `.env` file):

| Field    | Default value       |
|----------|---------------------|
| Email    | admin@example.com   |
| Password | admin12345          |

These credentials can be used to log in and test superuser-level access. Override them by setting `FIRST_SUPERUSER_EMAIL`, `FIRST_SUPERUSER_PASSWORD`, and `FIRST_SUPERUSER_FULL_NAME` in a `.env` file before starting the application.
