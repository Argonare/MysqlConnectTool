class Connect:
    database = None

    def __init__(self, ip=None, port=None, username=None, password=None, database=None, table=None, updateData=None,
                 add=False, type=None):
        self.name = ""
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.database = database
        self.table = table
        self.updateData = updateData
        self.add = add
        self.type = type
