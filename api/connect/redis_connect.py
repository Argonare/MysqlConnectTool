import uuid

import redis
import re

from api.model.connect import Connect


class RedisConnect:
    connect = None

    def __init__(self, connect: Connect):
        self.connect = connect

    def create_connect(self):
        try:
            db = redis.Redis(host=self.connect.ip, port=self.connect.port, password=self.connect.password)
            return db
        except Exception as err:
            raise Exception(err)
        # databases = r.config_get('databases')

    def get_databases(self, data: Connect, db):
        db_num = int(db.config_get('databases')["databases"])
        return [{"name": data.name, "showName": i, "leaf": False, "type": "redis", "level": 2,
                 "id": self.connect.name + "_db" + str(i)} for i
                in range(1, db_num + 1)]

    def get_table(self, data: Connect, db):
        result = [self.deal_key(db, key, db.get(key)) for key in db.scan_iter()]

        return self.build_tree(result, data.name)

    def desc_table(self, data: Connect, db):
        return [{"Field": "key", "comment": "键", "default": None},
                {"Field": "value", "comment": "值", "default": None}]

    def get_data(self, data: Connect, db, other):
        db.select(int(data.table))
        if "whereData" in other and other["whereData"] is not None:
            result = [self.deal_key(db, key, db.get(key)) for key in db.scan_iter(match='*' + other['whereData'] + '*')]
        else:
            result = [self.deal_key(db, key, db.get(key)) for key in db.scan_iter()]
        return {"list": result, "count": len(result), }

    def update_table(self, data: Connect, db, other):
        for i in data.updateData:
            db.set(i["key"], i["value"])
        return None

    def deal_key(self, db, key, value):
        key_type = db.type(key).decode('utf-8')
        key_decode = ''
        value_decode = ''
        try:
            key_decode = key.decode('utf-8')
            value_decode = value.decode('utf-8')
        except Exception as err:
            value_decode = re.findall("(.*?)\\\\", str(value[8:]))[0][2:-1]
            return {"value": value, "key": key_decode, "readOnly": True}

        if key_type == 'string':
            if len(value_decode) > 0 and value_decode[0] == "\"" and value_decode[-1] == "\"":
                value_decode = value_decode[1:-1]

            if value_decode == "true":
                return {"value": True, "key": key_decode, "type": "boolean"}
            if value_decode == "false":
                return {"value": False, "key": key_decode, "type": "boolean"}
            return {"value": value_decode, "key": key_decode, "type": "string"}
        return {"value": value, "key": key_decode}

    # 辅助函数，用于将层级列表转换为树形结构
    def build_tree(self, keys, name):
        tree = {}
        # 使用一个集合来跟踪所有已经作为子节点添加过的键
        added_keys = set()

        for key in keys:
            parts = key["key"].split(':')
            current = tree
            # 遍历键的每一部分，构建树形结构
            for i, part in enumerate(parts):
                if part not in current:
                    current[part] = {
                        'name': name,
                        'showName': part,
                        'value': key["value"],
                        'children': {},
                        'leaf': False,
                        "type": "redis",
                        "level": 4
                    }
                # 如果这不是键的最后一部分，那么它肯定不是叶子节点
                if i < len(parts) - 1:
                    current[part]['leaf'] = False
                    current[part]["level"] = 3
                else:
                    current[part]['children'] = []
                    continue
                current = current[part]['children']
            # 将完整的键添加到已添加集合中
            added_keys.add(key["key"])

        # 第二次遍历，标识叶子节点
        def mark_leaves(node):
            if not node['children']:
                node['leaf'] = True
            else:
                for child in node['children'].values():
                    mark_leaves(child)

        # 对整个树应用标记叶子节点的函数
        for key_part, node in tree.items():
            mark_leaves(node)
        self.dfs(tree)
        return list(tree.values())

    def dfs(self, tree):
        for key in tree:
            if not tree[key]['children']:
                return
            else:
                self.dfs(tree[key]['children'])
                tree[key]['children'] = list(tree[key]['children'].values())
