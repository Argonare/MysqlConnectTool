import json

import pymysql

from api.model.connect import Connect

from pymysql import converters, FIELD_TYPE

from api.model.dbField import DbField

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


def create_connect(connect: Connect):
    try:
        db = pymysql.connect(host=connect.ip, user=connect.username, password=connect.password, port=int(connect.port),
                             database=connect.database, cursorclass=pymysql.cursors.DictCursor, conv=conv,
                             )
        return db
    except Exception as err:
        raise Exception(err)


def convert_type(data, tm):
    if data is None:
        return "null"
    if tm == "int":
        return data

    return "'" + data + "'"


def convert_class(json_str, obj_class):
    if type(json_str) == str:
        parse_data = json.loads(json_str.strip('\t\r\n'))
    else:
        parse_data = json_str
    result = obj_class()
    result.__dict__ = parse_data

    return result


def get_length(field: DbField):
    if field.type == 'varchar':
        return "{0}({1})".format(field.type, field.len)
    if field.type == 'decimal':
        return "{0}({1},{2})".format(field.type,field.len, field.pointLen)
    return field.type
