import uuid

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
        return [{"name": i, "leaf": True, "type": "redis", "level": 2, "id": self.connect.name + "_db" + str(i)} for i
                in range(1, db_num + 1)]

    def get_table(self, data: Connect, db):
        return None

    def desc_table(self, data: Connect, db):
        return [{"Field": "key", "comment": "键", "default": None},
                {"Field": "value", "comment": "值", "default": None}]

    def get_data(self, data: Connect, db, other):
        db.select(int(data.table))
        if "whereData" in other and other["whereData"] is not None:
            result = [self.deal_key(db, key, db.get(key)) for key in db.scan_iter(match='*' + other['whereData'] + '*')]
        else:
            result = [self.deal_key(db, key, db.get(key)) for key in db.scan_iter()]
        return {"list": result, "count": len(result), }

    def update_table(self, data: Connect, db, other):
        for i in data.updateData:
            print(db.type(other[i]))
        return None

    def deal_key(self, db, key, value):
        key_type = db.type(key).decode('utf-8')
        key_decode = ''
        value_decode = ''
        try:
            key_decode = key.decode('utf-8')
            value_decode = value.decode('utf-8')
        except Exception as err:
            #TODO 匹配beanName
            print(err)

        if key_type == 'string':
            ret_str = value_decode
            if ret_str == "true":
                return {"value": False, "key": key_decode, "type": "true"}
            if ret_str == "false":
                return {"value": False, "key": key_decode, "type": "boolean"}
            return {"value": ret_str, "key": key_decode, "type": "string"}
        return {"value": value, "key": key_decode}
