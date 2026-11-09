import re

CONNECT_NAME_MAX_LENGTH = 64
CONNECT_ADDRESS_MAX_LENGTH = 253
CONNECT_USERNAME_MAX_LENGTH = 64
CONNECT_PASSWORD_MAX_LENGTH = 1024


class ConnectValidationError(ValueError):
    """连接参数校验失败"""


def _is_hostname_label(label):
    if not label or len(label) > 63:
        return False
    if not (label[0].isalnum() or label[0] == '_'):
        return False
    if not (label[-1].isalnum() or label[-1] == '_'):
        return False
    return all(char.isalnum() or char in '-_' for char in label)


def is_valid_address(value):
    """检查地址是否为合法的 IP 或域名"""
    if not value or len(value) > CONNECT_ADDRESS_MAX_LENGTH or any(char.isspace() for char in value):
        return False
    if ':' in value:
        if len(value) > 45:
            return False
        parts = value.split('%')
        if len(parts) > 2:
            return False
        ipv6 = parts[0]
        zone = parts[1] if len(parts) == 2 else None
        return (ipv6.count(':') >= 2 and
                re.fullmatch(r'[0-9A-Fa-f:.]+', ipv6) is not None and
                (zone is None or re.fullmatch(r'[A-Za-z0-9_.-]+', zone) is not None))
    host = value[:-1] if value.endswith('.') else value
    parts = host.split('.')
    if len(parts) == 4 and all(part.isdigit() for part in parts):
        return all(int(part) <= 255 for part in parts)
    return bool(parts) and all(_is_hostname_label(part) for part in parts)


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

    def validate_connection(self):
        """校验建立连接所需的参数，返回错误信息，通过时返回 None"""
        if isinstance(self.ip, str):
            self.ip = self.ip.strip()
        if isinstance(self.username, str):
            self.username = self.username.strip()
        ip = '' if self.ip is None else str(self.ip)
        if not ip.strip():
            return '请输入地址'
        if not is_valid_address(ip):
            return '请输入正确的地址（IP 或域名）'
        if self.port is None or str(self.port).strip() == '':
            return '请输入端口'
        try:
            port = int(self.port)
        except (TypeError, ValueError):
            return '请输入正确的端口'
        if port < 1 or port > 65535:
            return '端口范围为 1-65535'
        if self.username is not None and len(str(self.username)) > CONNECT_USERNAME_MAX_LENGTH:
            return '用户名不能超过{}个字符'.format(CONNECT_USERNAME_MAX_LENGTH)
        if self.password is not None and len(str(self.password)) > CONNECT_PASSWORD_MAX_LENGTH:
            return '密码不能超过{}个字符'.format(CONNECT_PASSWORD_MAX_LENGTH)
        return None

    def validate_save(self):
        """校验需要保存的连接信息，返回错误信息，通过时返回 None"""
        if not isinstance(self.name, str) or not self.name.strip():
            return '请输入连接名'
        if len(self.name) > CONNECT_NAME_MAX_LENGTH:
            return '连接名不能超过{}个字符'.format(CONNECT_NAME_MAX_LENGTH)
        return self.validate_connection()
