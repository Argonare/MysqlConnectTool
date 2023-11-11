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
import time
import uuid
from functools import wraps

import pymysql

from api.apiUtil import *
from api.apiUtil import convert, create_connect
from api.config.customException import Exp
from api.storage import Storage
from api.system import System
from api.model.connect import Connect


class API(System, Storage):
    '''业务层API，供前端JS调用'''

    def connect(func) -> object:
        @wraps(func)
        def decorate(self, data):
            connect, other = convert(Connect, data)

            if connect.name not in self.db_connect:
                db = create_connect(connect)
            else:
                db = self.db_connect[connect.name]
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

    def get_config(self, data):
        saved = []
        path = os.environ['USERPROFILE'] + "/database/data.json"
        if not os.path.exists(path):
            os.mkdir(os.environ['USERPROFILE'] + "/database")
            with open(path, 'w', encoding="utf-8") as f:
                f.write("[]")
            os.chmod(path, 755)
        else:
            with open(path, 'r', encoding="utf-8") as f:
                data = f.read()
                if data == "":
                    saved = []
                else:
                    saved = json.loads(data)
        return success(saved)

    def save_config(self, data):
        path = os.environ['USERPROFILE'] + "/database/data.json"
        with open(path, 'w', encoding="utf-8") as f:
            f.write(json.dumps(data))
        return success()

    def test_connect(self, data: Connect):
        connect: Connect = convert(Connect, data)
        db = create_connect(connect)
        db.close()
        return success()

    @connect
    def get_database(self, data: Connect, db, other):
        cmd = "show databases"
        database: list = self.cursor_data(db, cmd)
        for i in database:
            i["name"] = i["Database"]
        return success(database)

    @connect
    def get_table(self, data: Connect, db, other):
        cmd = "show tables"
        table: list = self.cursor_data(db, cmd)
        for i in table:
            i["name"] = i[list(i.keys())[0]]
            i["leaf"] = True
            i["level"] = 3
            i["id"] = str(uuid.uuid4())
            i["databases"] = data.database
        return success(table)

    @connect
    def get_data(self, data: Connect, db, other):
        page_size = other["pageSize"]  # 每页显示的记录数
        current_page = other["currentPage"]  # 当前页码
        start_position = (current_page - 1) * page_size
        cmd = "select * from " + data.table + " limit " + str(start_position) + "," + str(page_size)
        table_data = self.cursor_data(db, cmd)
        for i in table_data:
            i["@uuid"] = str(uuid.uuid4())
        cmd = "select count(1) as ct from " + data.table
        ct = self.cursor_data(db, cmd)[0]["ct"]
        return success({"list": table_data, "count": ct})

    @connect
    def desc_table(self, data: Connect, db, other):
        cmd = "show full columns from  " + data.table
        table_data = self.cursor_data(db, cmd)
        return success(table_data)

    @connect
    def update_table(self, data: Connect, db, other):
        cmd = ""
        for i in data.updateData:
            list = []
            cmd += "update " + data.table + " set "
            for j in data.updateData[i]:
                if j == "primaryKey":
                    continue
                list.append(j + "=" + convert_type(data.updateData[i][j]["value"], data.updateData[i][j]["type"]))
            cmd += ",".join(list) + " where " + data.updateData[i]["primaryKey"] + " = " + i + ";"
        print(cmd)
        self.cursor_data(db, cmd)
        db.commit()
        return success()

    @connect
    def exec_sql(self, data: Connect, db, other):
        cmd = other["sql"]

        page_size = other["pageSize"]  # 每页显示的记录数
        current_page = other["currentPage"]  # 当前页码
        start_position = (current_page - 1) * page_size
        count_cmd = "select count(1) as ct from (" + cmd + ") as t"
        count_data = self.cursor_data(db, count_cmd)[0]["ct"]
        if "limit" not in cmd:
            cmd = cmd + " limit " + str(start_position) + "," + str(page_size)

        table_data = self.cursor_data(db, cmd)
        db.commit()

        cmd = "desc " + data.table
        table_column = self.cursor_data(db, cmd)

        return success({"data": table_data, "column": table_column, "count": count_data})

    @connect
    def delete_sql(self, data: Connect, db, other):
        if "ids" not in other:
            return error("未选中数据")
        cmd = "delete from {0} where {1} in ({2})".format(data.table, other["primaryKey"], ",".join(other["ids"]))
        self.cursor_data(db, cmd)
        db.commit()
        return success()
