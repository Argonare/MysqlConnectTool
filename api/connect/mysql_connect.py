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

    def get_databases(self, db):
        cmd = "show databases"
        database: list = self.cursor_data(db, cmd)
        for i in database:
            i["name"] = i["Database"]

    def cursor_data(self, db, cmd):
        cursor = db.cursor()
        print(cmd)
        cursor.execute(cmd)
        data: list = cursor.fetchall()
        return data
