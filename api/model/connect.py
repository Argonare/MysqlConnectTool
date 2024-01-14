class Connect:

    def __init__(self, ip=None, port=None, username=None, password=None, database=None, table=None, updateData=None,
                 add=False):
        self.name = ""
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.database = database
        self.table = table
        self.updateData = updateData
        self.add = add

    def after_init(self):
        self.name = self.ip + ":" + str(self.port)
