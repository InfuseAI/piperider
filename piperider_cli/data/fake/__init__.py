import datetime
import os
import random

from sqlalchemy import MetaData, create_engine, insert
from sqlalchemy import Table, Column, Integer, String, Float, DateTime, Boolean


def generate_fake_data(db_path):
    meta = MetaData()

    data = Table(
        "data",
        meta,
        Column('id', Integer, primary_key=True),
        Column('a', String(30)),
        Column('b', Float),
        Column('c', DateTime),
        Column('d', Boolean),
    )

    engine = create_engine(f'sqlite:///{db_path}')
    meta.create_all(engine)

    from_datetime = datetime.datetime(2022, 6, 1)
    rnd = random.Random()
    rnd.seed(9527)

    stmts = []
    column_a = 'A'
    for x in range(10):
        value_a = chr(ord(column_a) + x)
        value_b = int((x + 1) * rnd.random())
        value_c = from_datetime + datetime.timedelta(days=x)

        if rnd.random() > 0.8:
            value_a = None

        value_d = rnd.random() < 0.6

        stmt = insert(data).values(a=value_a, b=value_b, c=value_c, d=value_d)
        stmts.append(stmt)

    with engine.connect() as conn:
        for s in stmts:
            conn.execute(s)


def gen():
    if os.path.exists('fake.db'):
        os.unlink('fake.db')
    generate_fake_data('fake.db')


if __name__ == '__main__':
    gen()
