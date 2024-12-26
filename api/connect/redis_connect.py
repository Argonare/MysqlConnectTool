import redis

from api.model.connect import Connect


class RedisConnect:
    connect = None

    def __init__(self, connect: Connect):
        self.connect = connect

    def create_connect(self):
        try:
            db = redis.Redis(host=self.connect.ip, port=self.connect.port, password=self.connect.password)
            return db
        except Exception as err:
            raise Exception(err)
        # databases = r.config_get('databases')

    def get_databases(self, db):
        db_num = int(db.config_get('databases')["databases"])
        return [{"name": i} for i in range(1, db_num + 1)]
