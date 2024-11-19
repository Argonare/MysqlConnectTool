#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
Author: 潘高
LastEditors: 潘高
Date: 2022-03-21 17:01:39
LastEditTime: 2023-05-30 15:41:05
Description: 业务层API，供前端JS调用
usage: 在Javascript中调用window.pywebview.api.<methodname>(<parameters>)
'''
import json
import os
import hashlib
import time
import uuid
from copy import deepcopy
from functools import wraps

import pymysql
import sqlparse
from pymysql import OperationalError, Connection
from pymysql.cursors import DictCursor

from api.apiUtil import *
from api.apiUtil import convert, create_connect, success
from api.model.dbField import DbField
from api.storage import Storage
from api.system import System
from api.model.connect import Connect


def close_connect(f):
    def over(*args, **kwargs):
        ret = f(*args, **kwargs)
        for i in args:
            if type(i) is Connection:
                i.close()
        return ret

    return over


class API(System, Storage):
    '''业务层API，供前端JS调用'''

    def connect(func) -> object:
        @wraps(func)
        def decorate(self, data):
            connect, other = convert(Connect, data)
            connect_name = connect.name
            if not check_empty(connect.database):
                connect_name = connect.name + ":" + connect.database
            final_connect = connect
            if connect_name not in self.db_connect:
                if connect.name in self.db_connect:
                    final_connect: Connect = deepcopy(self.db_connect[connect.name])
                    final_connect.database = connect.database
                self.db_connect[connect_name] = final_connect
            else:
                final_connect = self.db_connect[connect_name]
            final_connect.table = connect.table
            db = create_connect(final_connect)
            return func(self, connect, db, other)

        return decorate

    def cursor_data(self, db, cmd):
        cursor = db.cursor()
        print(cmd)
        cursor.execute(cmd)
        data: list = cursor.fetchall()
        return data

    def __init__(self):
        self.db_connect = {}

    def setWindow(self, window):
        '''获取窗口实例'''
        System.window = window

    change_log_path = os.environ['USERPROFILE'] + "/database/changeLog.json"
    config_path = os.environ['USERPROFILE'] + "/database/data.json"
    pre_set_path = os.environ['USERPROFILE'] + "/database/preSet.json"

    def save_change_log(self, data: Connect,cmd:str, sql: list):
        change_log = {}
        get_file(self.change_log_path, "{}", change_log)
        for i in sql:
            if data.name + "." + data.database in change_log:
                change_list: list = change_log[data.name + "." + data.database]
                change_list.append({"sql": cmd+' '+i, "time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())})
            else:
                change_log[data.name + "." + data.database] = [
                    {"sql": cmd+' '+i, "time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}]
        with open(self.change_log_path, "w") as f:
            f.write(json.dumps(change_log))

    @connect
    def get_change_log(self, data: Connect, db, other):
        change_log = {}
        change_log=get_file(self.change_log_path, "{}", change_log)
        return success(change_log)

    def get_config(self, emptyData):
        saved = []
        saved = get_file(self.config_path, "[]", saved)
        result = []
        for i in saved:
            connect = Connect()
            connect.__dict__ = i
            self.db_connect[connect.name] = connect
            result.append({"id": i["id"], "name": i["name"]})
        return success(result)

    def save_config(self, data):
        data[-1]["id"] = str(uuid.uuid4())
        with open(self.config_path, 'w', encoding="utf-8") as f:
            f.write(json.dumps(data))
        return success()

    @connect
    def test_connect(self, data: Connect, db, other):
        db = create_connect(data)
        db.close()
        return success()

    @connect
    @close_connect
    def get_database(self, data: Connect, db, other):
        cmd = "show databases"
        database: list = self.cursor_data(db, cmd)
        for i in database:
            i["name"] = i["Database"]
        return success(database)

    @connect
    def get_table(self, data: Connect, db, other):

        cmd = 'SELECT table_name,table_comment  FROM information_schema.TABLES WHERE TABLE_SCHEMA = "{0}"'.format(
            data.database)
        table: list = self.cursor_data(db, cmd)
        for i in table:
            i["name"] = i[list(i.keys())[0]]
            i["comment"] = i[list(i.keys())[1]]
            i["leaf"] = True
            i["level"] = 3
            md = hashlib.md5(data.database.encode())
            i["id"] = md.hexdigest()
            i["databases"] = data.database
        return success(table)

    @connect
    def get_data(self, data: Connect, db, other):
        page_size = other["pageSize"]  # 每页显示的记录数
        current_page = other["currentPage"]  # 当前页码
        where_data: str = other["whereData"]
        if where_data is not None and where_data.strip() != '':
            where_data = " where " + where_data
        else:
            where_data = ""
        start_position = (current_page - 1) * page_size
        cmd = "select * from " + data.table + where_data + " limit " + str(start_position) + "," + str(page_size)
        table_data = self.cursor_data(db, cmd)
        for i in table_data:
            i["@uuid"] = str(uuid.uuid4())
        count_cmd = "select count(1) as ct from " + data.table
        ct = self.cursor_data(db, count_cmd)[0]["ct"]
        return success({"list": table_data, "count": ct, "cmd": cmd})

    @connect
    def desc_table(self, data: Connect, db, other):
        if data.table is not None:
            cmd = "show full columns from  " + data.table
            table_data = self.cursor_data(db, cmd)
            return success(table_data)
        return success()

    @connect
    def update_table(self, data: Connect, db, other):
        cmd = ""
        for i in data.updateData:
            lis = []
            cmd += "update " + data.table + " set "
            for j in data.updateData[i]:
                if j == "primaryKey":
                    continue
                lis.append(j + "=" + convert_type(data.updateData[i][j]["value"], data.updateData[i][j]["type"]))
            cmd += ",".join(lis) + " where " + data.updateData[i]["primaryKey"] + " = " + i + ";"
        print(cmd)

        for i in other["insertData"]:
            del i["@add"]
            field = ",".join(['`' + x + '`' for x in i.keys()])
            cmd += "insert into " + data.table + " (" + field + ") values( " + ','.join(
                [str(x) for x in i.values()]) + ');'
        self.cursor_data(db, cmd)
        db.commit()
        return success()

    @connect
    def exec_sql(self, data: Connect, db, other):
        cmd = other["sql"]

        page_size = other["pageSize"]  # 每页显示的记录数
        current_page = other["currentPage"]  # 当前页码
        start_position = (current_page - 1) * page_size
        count_data = None
        try:
            # 表名不能用count 来算记录数
            count_cmd = "select count(0) as ct from (" + cmd + ") as t"
            count_data = self.cursor_data(db, count_cmd)[0]["ct"]
        except OperationalError as e:
            cursor: DictCursor = get_cursor(db, cmd)
            count_data = cursor.rowcount

        if "limit" not in cmd:
            cmd = cmd + " limit " + str(start_position) + "," + str(page_size)
        db.commit()
        cursor = get_cursor(db, cmd)
        table_data = cursor.fetchall()
        table_column = [{"Field": column[0]} for column in cursor.description]
        print(cursor.description)
        try:
            parsed_query = sqlparse.parse(cmd)
            # 遍历解析出表名
            table_names = []
            for stmt in parsed_query:
                for token in stmt.tokens:
                    if isinstance(token, sqlparse.sql.Identifier):
                        table_name = token.get_real_name()
                        table_names.append(table_name)
            table_names = list(set(table_names))

            for i in table_names:
                field_map = dict(
                    map(lambda x: (x["Field"], x["Comment"]), self.cursor_data(db, 'show full columns from ' + i)))
                for j in table_column:
                    if "Comment" not in j and j["Field"] in field_map and field_map[j["Field"]] != "":
                        j["Comment"] = field_map[j["Field"]]


        except Exception as e:
            print(e)
        print(table_column)
        return success({"data": table_data, "column": table_column, "count": count_data})

    @connect
    def delete_sql(self, data: Connect, db, other):
        if "ids" not in other:
            return error("未选中数据")
        cmd = "delete from {0} where {1} in ({2})".format(data.table, other["primaryKey"], ",".join(other["ids"]))
        self.cursor_data(db, cmd)
        db.commit()
        return success()

    @connect
    def alert_table(self, data: Connect, db, other: dict):
        if "changeList" not in other:
            return success()
        change_list: list = other["changeList"]
        cmd = "alter table {0} ".format(data.table)
        alert_lis = []
        for attr in change_list:
            if type(attr) != dict:
                continue
            field: DbField = convert_class(attr, DbField)
            if field.add is not None:
                content = ("add column {0} {1} default {2} comment '{3}'"
                           .format(field.field, get_length(field), check_null(field), field.comment))
                alert_lis.append(content)
            elif field.drop is not None:
                content = "DROP COLUMN {0}".format(field.field)
                alert_lis.append(content)
            else:
                if field.field is not None:
                    content = 'change {0} {1} {2} '.format(field.oldField, field.field, get_length(field))
                else:
                    content = 'modify {0} {1} '.format(field.oldField, get_length(field))

                if field.isNull is not None:
                    content += ("null " if field.isNull is True else "not null ")
                if field.comment is not None:
                    content += "comment '{0}'".format(field.comment)
                content += " default " + check_null(field)
                alert_lis.append(content)
        if len(alert_lis) > 0:
            self.cursor_data(db, cmd + ",".join(alert_lis) + ";")
        self.save_change_log(data,cmd, alert_lis)
        print(cmd + ",".join(alert_lis))
        return success()

    @connect
    def add_table(self, data: Connect, db, other: dict):
        if "changeList" not in other:
            return success()
        change_list: list = other["changeList"]

        cmd = "create table {0} (".format(data.table)
        alert_lis = []
        for attr in change_list:
            if type(attr) != dict:
                continue
            field: DbField = convert_class(attr, DbField)
            content = (" `{0}` {1} {2} null comment '{3}'"
                       .format(field.field, get_length(field), 'not' if not field.isNull else '', field.comment))

            alert_lis.append(content)
            if field.primary:
                alert_lis.append("PRIMARY KEY (`{0}`)".format(field.field))

        print(cmd + ",".join(alert_lis))
        self.cursor_data(db, cmd + ",".join(alert_lis) + ")")
        return success()

    @connect
    def drop_table(self, data: Connect, db, other: dict):
        cmd = "drop table {0} ".format(data.table)
        self.cursor_data(db, cmd)
        return success()

    @connect
    def show_table_sql(self, data: Connect, db, other: dict):
        cmd = "show CREATE table {0} ".format(data.table)
        result = self.cursor_data(db, cmd)
        return success(result[0]["Create Table"])

    @connect
    def explain_sql(self, data: Connect, db, other: dict):
        cmd = "explain {0} ".format(other["sql"])
        result = self.cursor_data(db, cmd)
        return success(result)

    @connect
    def get_table_and_field(self, data: Connect, db, other: dict):

        cmd = 'show tables;'
        table: list = self.cursor_data(db, cmd)
        md = hashlib.md5(data.database.encode())
        id = md.hexdigest()
        table_map={}
        table_map[id]={}
        for i in table:
            table_name=i[list(i.keys())[0]]
            sub_key=table_name
            table_map[id][sub_key] = [[], [], []]
            cmd = 'show full columns from '+table_name+';'
            table_info=self.cursor_data(db, cmd)
            for j in table_info:
                table_map[id][sub_key][0].append(list(j.keys())[0])
                table_map[id][sub_key][1].append(list(j.keys())[8])
                table_map[id][sub_key][2].append(list(j.keys())[1])
        return success(table_map)
