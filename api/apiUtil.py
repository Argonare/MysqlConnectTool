import json

import pymysql

from api.model.connect import Connect

from pymysql import converters, FIELD_TYPE

conv = converters.conversions

conv[FIELD_TYPE.NEWDECIMAL] = float  # convert decimals to float

conv[FIELD_TYPE.DATE] = str

conv[FIELD_TYPE.TIMESTAMP] = str  # convert dates to strings

conv[FIELD_TYPE.DATETIME] = str  # convert dates to strings

conv[FIELD_TYPE.TIME] = str  # convert dates to strings
conv[FIELD_TYPE.TINY] = int
conv[FIELD_TYPE.BIT] = lambda x: '0' if '\x00' else '1'


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
        db = pymysql.connect(host=connect.ip, user=connect.username, password=connect.password, port=int(connect.port),
                             database=connect.database, cursorclass=pymysql.cursors.DictCursor, conv=conv,
                             )
        return db
    except Exception as err:
        raise Exception(err)
