import uuid

import redis
import re
from api.apiUtil import *
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
        db.select(int(data.table))
        result = [self.deal_key(db, key, self.get_key(db, key)) for key in db.scan_iter()]

        return self.build_tree(result, data.name)

    def desc_table(self, data: Connect, db):
        return [{"Field": "key", "comment": "键", "default": None},
                {"Field": "value", "comment": "值", "default": None}]

    def get_data(self, data: Connect, db, other):
        db.select(int(data.table))
        if "wheresData" in other and other["whereData"] is not None and len(other["whereData"]) > 0:
            result = [self.deal_key(db, key, self.get_key(db, key)) for key in
                      db.scan_iter(match='*' + other['whereData'] + '*')]
        else:
            result = [self.deal_key(db, key, self.get_key(db, key)) for key in
                      db.scan_iter(match='*' + other['whereData'] + '*')]
        return {"list": result, "count": len(result), }

    def update_table(self, data: Connect, db, other):
        for i in data.updateData:
            ttl = int(i["ttl"]) if "ttl" in i else None
            if i['ttl'] is not None and ttl > 0:
                db.setex(i["key"], ttl, i["value"])
            elif db.exists(i["key"]) and ttl <= 0 < db.ttl(i["key"]):
                db.persist(i["key"])
            else:
                db.set(i["key"], i["value"])
        return None

    def select_by_key(self, data: Connect, db, other):
        db.select(int(data.table))
        key = other["nickName"]
        res = self.deal_key(db, key, db.get(key))
        res["ttl"] = db.ttl(other["nickName"])

        return res

    def delete_sql(self, data: Connect, db, other):
        db.select(int(data.table))
        if "keys" not in other:
            return error("未选中数据")

        for i in other["keys"]:
            db.delete(i)
        return success()

    def get_key(self, db, key):
        key_type = db.type(key).decode('utf-8')
        if key_type == "string":
            return db.get(key)
        elif key_type == "hash":
            result = {}
            data = db.hgetall(key)

            for i in data:
                result[i.decode('utf-8')] = data[i].decode('utf-8')
            return result

    def deal_key(self, db, key, value):
        key_type = db.type(key).decode('utf-8')
        key_decode = key
        value_decode = value
        try:
            if type(key_decode) != str:
                key_decode = key.decode('utf-8')
            if type(value) == bytes:
                value_decode = value.decode('utf-8')
        except Exception as err:
            value_decode = re.findall("(.*?)\\\\", str(value[8:]))[0][2:-1]
            return {"value": value_decode, "key": key_decode, "readOnly": True}

        if key_type == 'string':
            if len(value_decode) > 0 and value_decode[0] == "\"" and value_decode[-1] == "\"":
                value_decode = value_decode[1:-1]

            if value_decode == "true":
                return {"value": True, "key": key_decode, "type": "string"}
            if value_decode == "false":
                return {"value": False, "key": key_decode, "type": "string"}
            return {"value": value_decode, "key": key_decode, "type": "string"}
        return {"value": value, "key": key_decode, "type": key_type}

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
                        "level": 4,
                    }
                # 如果这不是键的最后一部分，那么它肯定不是叶子节点
                if i < len(parts) - 1:
                    current[part]['leaf'] = False

                    current[part]["level"] = 3
                else:
                    current[part]['id'] = key["key"]
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
                continue
            else:
                self.dfs(tree[key]['children'])
                tree[key]['children'] = list(tree[key]['children'].values())
