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
            connect: Connect = convert(Connect, data)
            if connect.name not in self.db_connect:
                db = create_connect(connect)
            else:
                db = self.db_connect[connect.name]
            return func(self, connect, db)

        return decorate

    def cursor_data(self, db, cmd):
        cursor = db.cursor()
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
    def get_database(self, data: Connect, db):
        cmd = "show databases"
        database: list = self.cursor_data(db, cmd)
        for i in database:
            i["name"] = i["Database"]

        return success(database)

    @connect
    def get_table(self, data: Connect, db):
        cmd = "show tables"
        table: list = self.cursor_data(db, cmd)
        for i in table:
            i["name"] = i[list(i.keys())[0]]
            i["leaf"] = True
            i["level"] = 3
            i["id"] = str(uuid.uuid4())
        return success(table)

    @connect
    def get_data(self, data: Connect, db):
        cmd = "select * from " + data.table + " limit 100"
        table_data = self.cursor_data(db, cmd)
        return success(table_data)

    @connect
    def desc_table(self, data: Connect, db):
        cmd = "desc " + data.table
        table_data = self.cursor_data(db, cmd)
        return success(table_data)
