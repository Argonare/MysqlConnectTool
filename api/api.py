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
import time

import pymysql

from api.apiUtil import *
from api.apiUtil import convert
from api.config.customException import Exp
from api.storage import Storage
from api.system import System
from api.model.connect import Connect


class API(System, Storage):
    '''业务层API，供前端JS调用'''

    def __init__(self):
        self.db_connect = {}

    def setWindow(self, window):
        '''获取窗口实例'''
        System.window = window

    def test_connect(self, data):
        connect: Connect = convert(Connect, data)
        db = create_connect(connect)
        db.close()
        return success()

    def get_database(self, data):
        connect: Connect = convert(Connect, data)
        if connect.name not in self.db_connect:
            db = create_connect(connect)
        else:
            db = self.db_connect[connect.name]
        cmd = "show databases"
        cursor = db.cursor()
        cursor.execute(cmd)
        data: list = cursor.fetchall()
        for i in data:
            i["name"] = i["Database"]

        return success(data)

    def get_table(self, data):
        connect: Connect = convert(Connect, data)
        if connect.name not in self.db_connect:
            db = create_connect(connect)
        else:
            db = self.db_connect[connect.name]
        cmd = "show tables"
        cursor = db.cursor()
        cursor.execute(cmd)
        data: list = cursor.fetchall()

        for i in data:
            i["name"] = i[list(i.keys())[0]]
            i["leaf"] = True
        print(data)
        return success(data)
