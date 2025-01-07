import redis

from api.model.connect import Connect


class RedisConnect:
    connect = None

    def __init__(self, connect: Connect):
        self.connect = connect

    def create_connect(self):
        try:
            db = redis.Redis(host=self.connect.ip, port=self.connect.port, password=self.connect.password,
                             decode_responses=True, encoding="iso-8859-1")
            return db
        except Exception as err:
            raise Exception(err)
        # databases = r.config_get('databases')

    def get_databases(self, db):
        db_num = int(db.config_get('databases')["databases"])
        return [{"name": i, "leaf": True, "type": "redis", "level": 2, "id": self.connect.name + "_db" + str(i)} for i
                in
                range(1, db_num + 1)]

    def get_table(self, data: Connect, db):
        return None

    def desc_table(self, data: Connect, db):
        return [{"Field": "key", "comment": "键", "default": None},
                {"Field": "value", "comment": "值", "default": None}]

    def get_data(self, data: Connect, db, other):
        db.select(int(data.table))
        result = [{"key": key, "value": db.get(key)} for key in db.scan_iter()]
        return {"list": result, "count": len(result),}
