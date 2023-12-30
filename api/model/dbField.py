class DbField(object):
    # 是否主键
    primary: bool = None
    # 是否为空
    isNull: bool = None
    # 顺序
    index: int = None
    # 是否为新增
    add: bool = None
    # 字段名称
    field: str = None
    # 类型 varchar int decimal
    type: str = None
    # 字符的长度
    len: int = None
    # 小数的长度
    pointLen: int = None
    # 备注
    comment: str = None
    oldField: str = None

    def __init__(self, primary: bool = None, isNull: bool = None, add: bool = None, field: str = None, type: str = None,
                 len: int = None, pointLen: int = None, comment: str = None, oldField: str = None):
        # 是否主键
        self.primary = primary
        # 是否为空
        self.isNull = isNull
        # 是否为新增
        self.add = add
        # 字段名称
        self.field = field
        # 类型 varchar int decimal
        self.type = type
        # 字符的长度
        self.len = len
        # 小数的长度
        self.pointLen = pointLen
        # 备注
        self.comment = comment
        # 老的字段名 改字段名用
        self.oldField = oldField
