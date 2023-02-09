#!/usr/bin/env python3
# _*_ coding:utf-8 _*_

import requests
import notify
import json

url = "http://niaoyun-a.xyz/user/checkin"
cookie = 'email=ntg5c2uvu%40disbox.org; expire_in=1646488539; ip=5ef503dd299b12bd89816e7625d3e111; key=52a132e35a91596fd15882e0d95efbcb728e1c5f9aad4; uid=10779'

payload = ""
headers = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Origin': 'http://niaoyun-a.xyz',
  'Cookie': cookie,
  'Referer': 'http://niaoyun-a.xyz/user',
  'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
  'Host': 'niaoyun-a.xyz',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
  'Content-Length': '0',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'X-Requested-With': 'XMLHttpRequest'
}

response = requests.request("POST", url, headers=headers, data=payload, allow_redirects=False)

# cookie 过期跳转302
stacode = str(response.status_code)
print("响应状态码", stacode)
if stacode == "302":
    print("cookie可能过期，响应码: ", stacode)
    print("开始发送通知......")
    notify.send("小鸟云自动签到: cookie可能过期", stacode)
# print(response.text)
if stacode == "200":
    print(response.json())
    r = response.json()
    ret = r["ret"]
    msg = r["msg"]
    print("ret = %s\nmsg = %s" % (ret, msg))
    if ret == 0:
        print("开始发送通知......")
        notify.send("小鸟云自动签到:", msg)
    if ret == 1:
        traffic = r["traffic"]
        todayUsedTraffic = r["trafficInfo"]["todayUsedTraffic"]
        lastUsedTraffic = r["trafficInfo"]["lastUsedTraffic"]
        unUsedTraffic = r["trafficInfo"]["unUsedTraffic"]
        print("小鸟云自动签到: %s \n流量使用情况:\n今日已用: %s\n过去已用: %s\n总流量: %s\n剩余流量: %s\n" %(msg, todayUsedTraffic, lastUsedTraffic, traffic, unUsedTraffic))
        print("开始发送通知......")
        trafficInfo = "小鸟云自动签到: %s \n流量使用情况:\n今日已用: %s\n过去已用: %s\n总流量: %s\n剩余流量: %s\n" %(msg, todayUsedTraffic, lastUsedTraffic, traffic, unUsedTraffic)
        notify.send("小鸟云自动签到:",trafficInfo)



# {
#     "ret": 0,
#     "msg": "您似乎已经签到过了..."
# }

# response = {
#     "msg": "获得了 26196MB 流量.",
#     "unflowtraffic": 1247483527168,
#     "traffic": "1.13TB",
#     "trafficInfo": {
#         "todayUsedTraffic": "2.45GB",
#         "lastUsedTraffic": "46.2GB",
#         "unUsedTraffic": "1.09TB"
#     },
#     "ret": 1
# }