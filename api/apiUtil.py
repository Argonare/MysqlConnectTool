import json

import pymysql

from api.model.connect import Connect


def success(data=""):
    return json.dumps({"code": 200, "msg": "操作成功", "data": data})


def error(msg="操作失败"):
    return json.dumps({"code": 500, "msg": str(msg)})


def convert(class_name: type, data):
    if type(data) == dict and type(class_name) == type:
        new_class = class_name()
        for i in data:
            if hasattr(new_class, i):
                setattr(new_class, i, data[i])
        if hasattr(new_class, "after_init"):
            after_init = getattr(new_class, "after_init")
            after_init()
        return new_class

    return data


def create_connect(connect: Connect):
    try:
        db = pymysql.connect(host=connect.ip, user=connect.username, password=connect.password, port=connect.port,
                             database=connect.database,cursorclass=pymysql.cursors.DictCursor)
        return db
    except Exception as err:
        raise Exception(err)
