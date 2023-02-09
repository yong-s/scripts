import axios from "axios";
import CryptoJs = require("crypto-js");
import qs = require("qs");
import bigInt = require("big-integer");
import dayjs = require("dayjs");
import cheerio = require("cheerio");

/** 内部的函数 */

function a() {
  var d,
    e,
    b = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    c = "";
  for (d = 0; 16 > d; d += 1)
    (e = Math.random() * b.length), (e = Math.floor(e)), (c += b.charAt(e));
  return c;
}

function b(a, b) {
  var c = CryptoJs.enc.Utf8.parse(b),
    d = CryptoJs.enc.Utf8.parse("0102030405060708"),
    e = CryptoJs.enc.Utf8.parse(a),
    f = CryptoJs.AES.encrypt(e, c, {
      iv: d,
      mode: CryptoJs.mode.CBC,
    });
  return f.toString();
}

function c(text) {
  text = text.split("").reverse().join("");
  const d = "010001";
  const e =
    "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
  const hexText = text
    .split("")
    .map((_) => _.charCodeAt(0).toString(16))
    .join("");
  const res = bigInt(hexText, 16)
    .modPow(bigInt(d, 16), bigInt(e, 16))
    .toString(16);

  return Array(256 - res.length)
    .fill("0")
    .join("")
    .concat(res);
}

function getParamsAndEnc(text) {
  const first = b(text, "0CoJUm6Qyw8W8jud");
  const rand = a();
  const params = b(first, rand);

  const encSecKey = c(rand);
  return {
    params,
    encSecKey,
  };
}

function formatMusicItem(_) {
  const album = _.al || _.album;
  return {
    id: _.id,
    artwork: album.picUrl,
    title: _.name,
    artist: (_.ar || _.artists)[0].name,
    album: album.name,
    url: `https://music.163.com/song/media/outer/url?id=${_.id}.mp3`,
    qualities: {
      low: {
        size: (_.l || {}).size,
      },
      standard: {
        size: (_.m || {}).size,
      },
      high: {
        size: (_.h || {}).size,
      },
      super: {
        size: (_.sq || {}).size,
      },
    },
  };
}

function formatAlbumItem(_) {
  return {
    id: _.id,
    artist: _.artist.name,
    title: _.name,
    artwork: _.picUrl,
    description: "",
    date: dayjs.unix(_.publishTime / 1000).format("YYYY-MM-DD"),
  };
}

function musicCanPlayFilter(_) {
  return (_.fee === 0 || _.fee === 8) && _.privilege.st >= 0;
}

const pageSize = 30;
async function searchBase(query, page, type) {
  const data = {
    s: query,
    limit: pageSize,
    type: type,
    offset: (page - 1) * pageSize,
    csrf_token: "",
  };
  const pae = getParamsAndEnc(JSON.stringify(data));
  const paeData = qs.stringify(pae);

  const headers = {
    authority: "music.163.com",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    "content-type": "application/x-www-form-urlencoded",
    accept: "*/*",
    origin: "https://music.163.com",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    referer: "https://music.163.com/search/",
    "accept-language": "zh-CN,zh;q=0.9",
  };

  const res = (
    await axios({
      method: "post",
      url: "https://music.163.com/weapi/cloudsearch/get/web?csrf_token=",
      headers,
      data: paeData,
    })
  ).data;

  return res;
}

async function searchMusic(query, page) {
  const res = await searchBase(query, page, 1);

  const songs = res.result.songs
    .filter(musicCanPlayFilter)
    .map(formatMusicItem);

  return {
    isEnd: res.result.songCount <= page * pageSize,
    data: songs,
  };
}

async function searchAlbum(query, page) {
  const res = await searchBase(query, page, 10);

  const albums = res.result.albums.map(formatAlbumItem);

  return {
    isEnd: res.result.albumCount <= page * pageSize,
    data: albums,
  };
}

async function searchArtist(query, page) {
  const res = await searchBase(query, page, 100);

  const artists = res.result.artists.map((_) => ({
    name: _.name,
    id: _.id,
    avatar: _.img1v1Url,
    worksNum: _.albumSize,
  }));

  return {
    isEnd: res.result.artistCount <= page * pageSize,
    data: artists,
  };
}

async function getArtistWorks(artistItem, page, type) {
  const data = {
    csrf_token: "",
  };
  const pae = getParamsAndEnc(JSON.stringify(data));
  const paeData = qs.stringify(pae);

  const headers = {
    authority: "music.163.com",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    "content-type": "application/x-www-form-urlencoded",
    accept: "*/*",
    origin: "https://music.163.com",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    referer: "https://music.163.com/search/",
    "accept-language": "zh-CN,zh;q=0.9",
  };

  if (type === "music") {
    const res = (
      await axios({
        method: "post",
        url: `https://music.163.com/weapi/v1/artist/${artistItem.id}?csrf_token=`,
        headers,
        data: paeData,
      })
    ).data;
    return {
      isEnd: true,
      data: res.hotSongs.filter(musicCanPlayFilter).map(formatMusicItem),
    };
  } else if (type === "album") {
    const res = (
      await axios({
        method: "post",
        url: `https://music.163.com/weapi/artist/albums/${artistItem.id}?csrf_token=`,
        headers,
        data: paeData,
      })
    ).data;
    return {
      isEnd: true,
      data: res.hotAlbums.map(formatAlbumItem),
    };
  }
}

async function getTopListDetail(topListItem) {
  const musicList = await getSheetMusicById(topListItem.id);
  return {
    ...topListItem,
    musicList,
  };
}

async function getLyric(musicItem) {
  const headers = {
    Referer: "https://y.music.163.com/",
    Origin: "https://y.music.163.com/",
    authority: "music.163.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = { id: musicItem.id, lv: -1, tv: -1, csrf_token: "" };
  const pae = getParamsAndEnc(JSON.stringify(data));
  const paeData = qs.stringify(pae);

  const result = (
    await axios({
      method: "post",
      url: `https://interface.music.163.com/weapi/song/lyric?csrf_token=`,
      headers,
      data: paeData,
    })
  ).data;

  return {
    rawLrc: result.lrc.lyric,
  };
}

async function getAlbumInfo(albumItem) {
  const headers = {
    Referer: "https://y.music.163.com/",
    Origin: "https://y.music.163.com/",
    authority: "music.163.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const data = {
    resourceType: 3,
    resourceId: albumItem.id,
    limit: 15,
    csrf_token: "",
  };
  const pae = getParamsAndEnc(JSON.stringify(data));
  const paeData = qs.stringify(pae);

  const res = (
    await axios({
      method: "post",
      url: `https://interface.music.163.com/weapi/v1/album/${albumItem.id}?csrf_token=`,
      headers,
      data: paeData,
    })
  ).data;

  return {
    ...albumItem,
    description: res.album.description,
    musicList: (res.songs || [])
      .filter(musicCanPlayFilter)
      .map(formatMusicItem),
  };
}

async function getValidMusicItems(trackIds) {
  const headers = {
    Referer: "https://y.music.163.com/",
    Origin: "https://y.music.163.com/",
    authority: "music.163.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  try {
    const data = {
      csrf_token: "",
      ids: `[${trackIds.join(",")}]`,
      level: "standard",
      encodeType: "flac",
    };
    const pae = getParamsAndEnc(JSON.stringify(data));
    const urlencoded = qs.stringify(pae);
    const res = (
      await axios({
        method: "post",
        url: `https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=`,
        headers,
        data: urlencoded,
      })
    ).data;

    const validTrackIds = res.data.filter((_) => _.url).map((_) => _.id);
    const songDetails = (
      await axios.get(
        `https://music.163.com/api/song/detail/?id=${
          validTrackIds[0]
        }&ids=[${validTrackIds.join(",")}]`,
        { headers }
      )
    ).data;
    const validMusicItems = songDetails.songs
      .filter((_) => _.fee === 0 || _.fee === 8)
      .map(formatMusicItem);
    return validMusicItems;
  } catch (e) {
    return [];
  }
}

async function getSheetMusicById(id) {
  const headers = {
    Referer: "https://y.music.163.com/",
    Origin: "https://y.music.163.com/",
    authority: "music.163.com",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36",
      cookie: "_ntes_nuid=45e4ad07c966e3e0aa0d2831def529a6; NMTID=00OoRtI_B_K8WqnVk00sh2wuQ26bawAAAF9Qbr8YA; WEVNSM=1.0.0; WNMCID=xtumrb.1637485313216.01.0; WM_TID=XuJ40vu%2BmzJBABRFFAZ75yQXi9yuru5M; _9755xjdesxxd_=32; _ns=NS1.2.1502176991.1652085608; NTES_CMT_USER_INFO=260675063%7C%E6%9C%89%E6%80%81%E5%BA%A6%E7%BD%91%E5%8F%8B0fypnT%7Chttp%3A%2F%2Fcms-bucket.nosdn.127.net%2F2018%2F08%2F13%2F078ea9f65d954410b62a52ac773875a1.jpeg%7Cfalse%7CamFtaWV5emdAMTYzLmNvbQ%3D%3D; vinfo_n_f_l_n3=74aa17e8407def13.1.1.1647090567421.1647090617073.1669280429933; _ntes_nnid=45e4ad07c966e3e0aa0d2831def529a6,1670569994484; nts_mail_user=jamieyzg@163.com:-1:1; NTES_P_UTID=j4PLa6xWrKZx515YScE2NRFB85ZQMn8g|1673423634; NTES_PASSPORT=HPoM1T0FnjT70qfD6foh5U3OXY_tk_PZmUT_AW1PisFb.6Js.4TFkUkPdLEJcnQXt2fy0nuozSDr3V42xl0SHo34rppUheb70EssW4otE2lfQydFvD6B5KP3crxPMyhbphkvZ8FdXliHR6wc55O_rxrVwmMyQ.55rvJBNRYxScXrSFuAj.5l.Tt31403JfHOh; WM_NI=ixW5wJlF7dIpa7rx6q%2BLkOPMdiaOXeFGPJ0YNmAfenBCAPQtc3GZ60B047EQqza7VMWL5NiARlmJTlKteHpXR9MkEg3KUk9NvDW1ODwLPnw1mLri2w6CXDLvlXNdqjReSjk%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeb1ec4785b7a3d5ee6ff1b08bb2c84a928b9a83c46b86ebb9b6db73a7bfbfa2b12af0fea7c3b92aaba899d6f642b09af985cc7ca3e9be99b57be994a5b0d347a8b7afb0db6f8699a0abb3538eb38f87e866829d8fb1d480a1ed89bbb53c82f0fcd8c85bb3a6afd8d5479594fbafec4b92b4a3abd76889acaba9f35492e7838cc86df1959b8cbc46b69c99d2ce50b594a08ff63baf94be8ab17df69d98a5cf7eb0888285f46292bb9d8bea37e2a3; __snaker__id=YzSdQdntEk5F4RcF; gdxidpyhxdE=7Hc6BSRU1mBa%5CfwVWZwnsPjAOQ0U2gNCDXsK3qXkBKaO%2FLTccvZAAmsIAQ8eWnrRwt0%2FKrhSrhYuSkMcXVBwTuhPSfxYHbmTdHVo8PAiHwiE0A9v%2BE7jElhXnjpBWER0x6%2FPDId%2BihdpuBOppYGCx5jNMVNE7tZ76p8SM04zJ9%5CqIhd%2F%3A1675911002489; YD00000558929251%3AWM_NI=tADxHHb29hlqbZc9Ul%2FhLSP0a0Zf%2BTyHHQGmVPcPPWZtAkuCAg4YL9phtS0aNYtZxxuaZxiDaUPuclrSMHktbQABNvsr%2F79BjBdjEEzY8q0aG9hyYkG5wdoNgN5Y4nElZHg%3D; YD00000558929251%3AWM_NIKE=9ca17ae2e6ffcda170e2e6ee83ce678da8bdd4cc52a7b48ab6d54b868a8e87d84596acb9a7db3aa6f181baaa2af0fea7c3b92ab89f8c99cb44a2eef789ef7ba286addad868edb884b4d33ca3f09687aa60bb9888b2c6679690adb1d35d9aac8f8cf84983b9fcbacf33b4b8bcb4b36b8e87bcbbfb74b7bf9699ec50a38ba096e268b28d83a9ea80a28f8fa3cd7eb1aee1d8bc4aaa9eac8bc84fba87f892b36b85e7a89adc6185ebb985ee46a592fbbab76687b496a9e637e2a3; YD00000558929251%3AWM_TID=O4ah8eM8RR9FARQERAaAKEo1AHyPufZv; __csrf=19a413a5b5ce90c6829e73ca8996e66e; MUSIC_U=a3e6a524cc4bbd10fab83dcbc37f70ab63caaa794533fa5f3b993a408adeeeaa519e07624a9f0053e111098d3d4cd6c7d9595a6e48bb61aa696eb5202b0d8680a3d965317fba1e17a0d2166338885bd7; __remember_me=true; JSESSIONID-WYYY=NC16elnO064hqRulWqdD7itUD0VD1mqGZgAQ%2Fd8yNRw671vyWyuYMp2RZhC5u%2FODZJ1cMfPxzGp%2BEC3%2B9ixsH9R%2FghDaMAoGGcxFQoFYh9BqZ3824EPqOY8iyFZKISxuUHgMO71sfWJY9x8WcQWQzQ%5CziI0BH0BU5JhR%2FZEh%5CVIje%2Fuv%3A1675933089862; _iuqxldmzr_=33"
  };
  const sheetDetail = (
    await axios.get(
      `https://music.163.com/api/v3/playlist/detail?id=${id}&n=5000`,
      {
        headers,
      }
    )
  ).data;
  const trackIds = sheetDetail.playlist.trackIds.map((_) => _.id);
  let result = [];
  let idx = 0;
  while (idx * 200 < trackIds.length) {
    const res = await getValidMusicItems(
      trackIds.slice(idx * 200, (idx + 1) * 200)
    );
    result = result.concat(res);
    ++idx;
  }
  return result;
}

async function importMusicSheet(urlLike) {
  const matchResult = urlLike.match(
    /(?:https:\/\/y\.music\.163.com\/m\/playlist\?id=([0-9]+))|(?:https?:\/\/music\.163\.com\/playlist\/([0-9]+)\/.*)|(?:https?:\/\/music.163.com\/#\/playlist\?id=(\d+))|(?:^\s*(\d+)\s*$)/
  );
  const id = matchResult[1] || matchResult[2] || matchResult[3] || matchResult[4];
  return getSheetMusicById(id);
}

async function getTopLists() {
  const res = await axios.get("https://music.163.com/discover/toplist", {
    headers: {
      referer: "https://music.163.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54",
    },
  });
  const $ = cheerio.load(res.data);
  const children = $(".n-minelst").children();
  const groups = [];
  let currentGroup: Record<string, any> = {};
  for (let c of children) {
    if (c.tagName == "h2") {
      if (currentGroup.title) {
        groups.push(currentGroup);
      }
      currentGroup = {};
      currentGroup.title = $(c).text();
      currentGroup.data = [];
    } else if (c.tagName === "ul") {
      let sections = $(c).children();
      currentGroup.data = sections
        .map((index, element) => {
          const ele = $(element);
          const id = ele.attr("data-res-id");
          const coverImg = ele.find("img").attr("src");
          const title = ele.find("p.name").text();
          const description = ele.find("p.s-fc4").text();

          return {
            id,
            coverImg,
            title,
            description,
          };
        })
        .toArray();
    }
  }
  if (currentGroup.title) {
    groups.push(currentGroup);
  }

  return groups;
}

const qualityLevels: Record<IMusic.IQualityKey, string> = {
  low: '',
  standard: 'standard',
  high: 'exhigh',
  super: 'lossless'
}
/** 获取音乐源 */
async function getMediaSource(musicItem: IMusic.IMusicItem, quality: IMusic.IQualityKey) {
  if(quality !== 'standard') {
    return;
  }
  return {
    url: `https://music.163.com/song/media/outer/url?id=${musicItem.id}.mp3`,
  };
}

module.exports = {
  platform: "网易云",
  version: "0.1.1",
  appVersion: '>0.1.0-alpha.0',
  srcUrl: "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/netease/index.js",
  cacheControl: "no-store",
  hints: {
    importMusicSheet: [
      '网易云移动端：APP点击分享，然后复制链接',
      '网易云H5/PC端：复制URL，或者直接输入歌单ID即可',
      '默认歌单无法导入，先新建一个空白歌单复制过去再导入新歌单即可',
      '导入过程中会过滤掉所有VIP/试听/收费音乐，导入时间和歌单大小有关，请耐心等待'
    ]
  },
  async search(query, page, type) {
    if (type === "music") {
      return await searchMusic(query, page);
    }
    if (type === "album") {
      return await searchAlbum(query, page);
    }
    if (type === "artist") {
      return await searchArtist(query, page);
    }
  },
  getMediaSource,
  getAlbumInfo,
  getLyric,
  getArtistWorks,
  importMusicSheet,
  getTopLists,
  getTopListDetail,
};
