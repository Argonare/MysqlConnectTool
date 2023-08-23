class Connect:

    def __init__(self, ip=None, port=None, username=None, password=None, database=None, table=None):
        self.name = ""
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.database = database
        self.table = table

    def after_init(self):
        self.name = self.ip + ":" + str(self.port)
