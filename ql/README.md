# scripts

Backups

# 1、部署ql

docker-compose.yml 下载部署

# 2、一键配置ql

```
docker exec -it qinglong bash -c 1custom.sh
```

```
docker exec -it qinglong bash -c "$(curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/yong-s/scripts/main/1custom.sh)"
```
 一键不能用，可手动配置
 extra.sh 初始化文件
 config.sh 配置
 code.sh
 task_before.sh
 jdCookie.js

 添加定时任务：
 初始化任务：  ql extra       15 0-23/4 * * *
 拉取机器人   ql bot      13 14 * * *
 自动更新模版  curl -L https://git.io/config.sh -o /ql/sample/config.sample.sh && cp -rf /ql/sample/config.sample.sh /ql/config   45 6,18 * * *	


# 3、替换原有配置文件

config.sh
bot.json

# 4、扫码提交ck

https://github.com/yong-s/Waikiki_ninja

# 5、ccwav通知

https://github.com/ccwav/QLScript2

安装完后

CK_WxPusherUid.json 覆盖
