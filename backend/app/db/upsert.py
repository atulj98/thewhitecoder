from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session


def insert_for(db: Session, table):
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        return pg_insert(table)
    if dialect == "sqlite":
        return sqlite_insert(table)
    raise HTTPException(503, "Accounts and progress require PostgreSQL")
