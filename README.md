### 项目简介（Project Introduction）

在我开发的过程中，最常用的mysql连接工具就是navicat

>In the process of my development, the most commonly used mysql connection tool is navicat.

它很好用并且我在互联网上几乎没有平替的工具

>It is very easy to use and there is almost no alternative tool on the Internet.

我用过DBeaver、mysql workbench、SQLyog，但是感觉都没它好用

>I have used DBeaver, MySQL Workbench, and SQLyog before, but I feel that none of them are as useful as it is


但是在使用中我仍然发现了一些可以让它变得更好用的改动

>I still found some changes that can make it better.

在构思了一段时间之后，我开始了这个项目的开发

>After thinking about it for a while, I started the development of this project.

在我想到更好的名字之前，目前暂且先叫这个项目为MysqlConnectToo

>Before I come up with a better name, let's call this project MysqlConnectToo for now

这是我独立开发的第一个项目，我觉得我能做的很好

>this is the first project I independently developed, I think I can do better.

### 功能列表（Function List）

- [ ] 增删改查的基础功能（Basic functions of add, delete ,edit and select）
- [x] 注释字段切换（switch comment and field）
- [x] 隐藏某列字段（hide someone field）
- [ ] 筛选字段方案（Filter Field Scheme）
- [ ] 更好的sql提示（better sql prompts）
- [ ] 查看数据表语句（view sql how to create table or field）
- [ ] 查看数据库变更记录（view history of table or field changed）
- [ ] 字段预设方案，如创建时间，创建人等（add preset scheme,like create_time,create by etc.）
- [ ] 拍照生成表和数据（parse photo and generate table and data from photo）
- [ ] 适配mybatis,包括运行，解析等（Adapt and generate mybatis sql xml,include run and parse）
- [ ] 连接redis（connect redis）
- [ ] 编辑模式和查询模式（直接代替sql查询？）（edit mode and select mode ,may replace select by sql?）

其他的想到了再说（when I think of something new,I will add it to this list）

### 环境需求（Environmental requirements）

- Node.js 16.14+
- pnpm 8.x+
- Python 3.8-3.11

### 环境搭建（Building Environment）

```shell
pnpm run init
```

### 运行（Running）

```shell
pnpm run dev
```

```shell
python main.py
```

### 打包（Packing）

- 正式打包（Formal Packaging）

```shell
pnpm run build
```

- 预打包，带console（Pre Packaging，With Console）

```shell
pnpm run pre
```

### 相关资料 （Infomation）

[pywebview](https://pywebview.flowrl.com/guide/api.html)

[PPX](https://github.com/pangao1990/PPX)
