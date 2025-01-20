from copy import deepcopy

from api import apiUtil
from api.connect.mysql_connect import MysqlConnect
from api.connect.redis_connect import RedisConnect
from api.model.connect import Connect


class ConnectBase:
    db_connect = {}
    db_bean = {}

    def open_connect(self, data):
        connect, other = self.convert(Connect, data)
        connect_name = connect.name
        if type(connect.database) == int:
            connect_name = str(connect.name) + ":" + str(connect.database)
        elif not apiUtil.check_empty(connect.database):
            connect_name = str(connect.name) + ":" + connect.database
        final_connect = connect
        if connect_name not in self.db_connect:
            if connect.name in self.db_connect:
                final_connect: Connect = deepcopy(self.db_connect[connect.name])
                final_connect.database = connect.database
            self.db_connect[connect_name] = final_connect
        else:
            final_connect = self.db_connect[connect_name]
        final_connect.table = connect.table
        if connect_name not in self.db_bean:
            if connect.type == "mysql":
                self.db_bean[connect_name] = MysqlConnect(self.db_connect[connect_name])
            elif connect.type == "redis":
                self.db_bean[connect_name] = RedisConnect(self.db_connect[connect_name])
        db = self.db_bean[connect_name].create_connect()
        return connect, db, other

    def get_databases(self, data: Connect, db):
        return self.db_bean[data.name].get_databases(data,db)

    def set_config(self, name, data):
        self.db_connect[name] = data

    def convert(self, class_name: type, data):
        other = {}
        if type(data) == dict and type(class_name) == type:
            new_class = class_name()
            for i in data:
                if hasattr(new_class, i):
                    setattr(new_class, i, data[i])
                else:
                    other[i] = data[i]
            if hasattr(new_class, "after_init"):
                after_init = getattr(new_class, "after_init")
                after_init()
            return new_class, other

        return data, other

    def get_table(self, data: Connect, db):
        return self.db_bean[data.name].get_table(data, db)

    def desc_table(self, data: Connect, db):
        return self.db_bean[data.name].desc_table(data, db)

    def get_data(self, data: Connect, db, other):
        return self.db_bean[data.name].get_data(data, db, other)

    def update_table(self, data: Connect, db, other):
        return self.db_bean[data.name].update_table(data, db, other)
