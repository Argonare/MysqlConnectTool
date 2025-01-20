import json

import pymysql
from pymysql.constants import CLIENT

from api.model.connect import Connect

from pymysql import converters, FIELD_TYPE

from api.model.dbField import DbField
import os

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


def get_cursor(db, cmd):
    cursor = db.cursor()
    cursor.execute(cmd)
    return cursor


def check_empty(data: str):
    return data is None or data.strip() == ""


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
        return "{0}({1},{2})".format(field.type, field.len, field.pointLen)
    return field.type


def check_null(field: DbField):
    if field.default is None or field.default.upper() == "NULL":
        return 'null'
    if field.type == 'decimal' or field.type == "int":
        return str(field.default)
    return "'" + str(field.default) + "'"


def get_file(path: str, default_str: str, result_obj):
    if not os.path.exists(os.environ['USERPROFILE'] + "/database"):
        os.mkdir(os.environ['USERPROFILE'] + "/database")
    if not os.path.exists(path):
        with open(path, 'w', encoding="utf-8") as f:
            f.write(default_str)
        os.chmod(path, 755)
    else:
        with open(path, 'r', encoding="utf-8") as f:
            data = f.read()
            if data is not None and data != "":
                return json.loads(data)
    return result_obj



