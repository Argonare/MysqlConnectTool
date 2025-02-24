import hashlib
import uuid

from api.model.connect import Connect
import pymysql
from pymysql import OperationalError, Connection
from pymysql.cursors import DictCursor
from api.apiUtil import *


class MysqlConnect:
    connect = None

    def __init__(self, connect: Connect):
        self.connect = connect

    def create_connect(self):

        try:
            if self.connect.database is not None:
                db = pymysql.connect(host=self.connect.ip, user=self.connect.username, password=self.connect.password,
                                     port=int(self.connect.port),
                                     database=self.connect.database, cursorclass=pymysql.cursors.DictCursor, conv=conv,
                                     client_flag=CLIENT.MULTI_STATEMENTS)
            else:
                db = pymysql.connect(host=self.connect.ip, user=self.connect.username, password=self.connect.password,
                                     port=int(self.connect.port), cursorclass=pymysql.cursors.DictCursor, conv=conv,
                                     client_flag=CLIENT.MULTI_STATEMENTS)
            return db
        except Exception as err:
            raise Exception(err)

    def get_databases(self, data: Connect, db):
        cmd = "show databases"
        database: list = self.cursor_data(db, cmd)
        for i in database:
            i["name"] = i["Database"]
            i["type"] = "mysql"
        return database

    def delete_sql(self, data: Connect, db,other):
        if "ids" not in other:
            return error("未选中数据")
        cmd = "delete from {0} where {1} in ({2})".format(data.table, other["primaryKey"], ",".join(other["ids"]))
        self.cursor_data(db, cmd)
        db.commit()
        return success()


    def cursor_data(self, db, cmd):
        cursor = db.cursor()
        print(cmd)
        cursor.execute(cmd)
        data: list = cursor.fetchall()
        return data

    def get_table(self, data: Connect, db):
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
            i["type"] = "mysql"
        return table

    def desc_table(self, data: Connect, db):
        if data.table is not None:
            cmd = "show full columns from  " + data.table
            table_data = self.cursor_data(db, cmd)
            return table_data
        return None

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
        return {"list": table_data, "count": ct, "cmd": cmd}

    def update_table(self, data: Connect, db, other):
        cmd = ""
        for i in data.updateData:
            lis = []
            cmd += "update " + data.table + " set "
            for j in data.updateData[i]:
                if j == "primaryKey":
                    continue
                lis.append(j + "=" + convert_type(data.updateData[i][j]["value"], data.updateData[i][j]["type"]))
            cmd += ",".join(lis) + " where " + data.updateData[i]["primaryKey"] + " = '" + i + "';"
        print(cmd)

        for i in other["insertData"]:
            del i["@add"]
            field = ",".join(['`' + x + '`' for x in i.keys()])
            cmd += "insert into " + data.table + " (" + field + ") values( " + ','.join(
                [str(x) for x in i.values()]) + ');'
        self.cursor_data(db, cmd)
        db.commit()
        return None