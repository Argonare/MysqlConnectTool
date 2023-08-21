# 自定义异常类 MyError ，继承普通异常基类 Exception
from api.apiUtil import error


class Exp(Exception):
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return self.value
