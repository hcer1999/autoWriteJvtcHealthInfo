const request = require('request');
const cheerio = require('cheerio');
const program = require('commander');
const nodemailer = require('nodemailer');
require('colors');
const VERSION = require('../package.json').version;

program
  .version(VERSION)
  .usage('[options]')
  .option('-u, --username <string>', '设置用户名')
  .option('-p, --password <string>', '设置密码')
  .option('-t, --executionTime <string>', '执行时间/24小时制', '12:24')
  .option('-n, --note <string>', '备注', '未备注')
  .option('-m, --email <string>', '邮件地址')
  .parse(process.argv);

const username = program.username;
const password = program.password;
const note = program.note;
const toEmail = program.email;
const H = parseInt(program.executionTime.split(':')[0]);
const M = parseInt(program.executionTime.split(':')[1]);

function start() {
  console.log('========== 程序已启动，程序版本:%s =========='.green.bold, VERSION);
  console.log('========== 任务已开启：每天%s点%s分-%s =========='.yellow.bold, H.toString(), M.toString(), note);
  sendEmail({
    email: toEmail,
    subject: '九职自动填报系统-任务开启成功',
    text: '您已开启九职健康平台自动填报健康信息功能',
    html: `${note}-您在九职健康平台的自动填报任务已开启，已更新填报体温功能，将在每天的<b>${H.toString()}点${M.toString()}</b>给您发送邮件提醒，请留意邮件~<br>如果到了签到时间未收到邮件，请自行登录网址检查<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
  });
  console.log('------------------------------');
  setInterval(() => {
    // 开启定时器，每分钟检测一次是否到设置的时间
    const date = new Date();
    console.log('========== 当前时间:%s点%s分 =========='.green.bold, date.getHours(), date.getMinutes());
    if (date.getMinutes() != M || date.getHours() != H) {
      console.log('========== %s-未到设置的填写时间：%s点%s分 =========='.yellow.bold, note, H.toString(), M.toString());
      console.log('------------------------------');
    } else {
      console.log('========== 吉时已到，准备登录%s的账号,学号为：%s =========='.green.bold, note, username);

      // getReSubmiteFlag();  执行开始
      getReSubmiteFlag(username, password);
    }
  }, 60000);
}

// 生成验证码
function NewCode() {
  var code = '';
  var codeLength = 4;
  var selectChar = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ];
  for (i = 0; i < codeLength; i++) {
    var charIndex = Math.floor(Math.random() * 62);
    code += selectChar[charIndex];
  }
  return code;
}

// 获取一条奇怪的验证请求头
function getReSubmiteFlag(username, password) {
  request('http://xz.jvtc.jx.cn/SPCP/Web/', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const $ = cheerio.load(body);
      const reSubmiteFlag = $('input[name="ReSubmiteFlag"]').val();
      // 首次登陆的包
      const data = {
        url: 'http://xz.jvtc.jx.cn/SPCP/Web/',
        form: {
          ReSubmiteFlag: reSubmiteFlag,
          StuLoginMode: '1',
          txtUid: username,
          txtPwd: password,
          codeInput: NewCode(),
        },
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'max-age=0',
          Connection: 'keep-alive',
          'Content-Length': 111,
          'Content-Type': 'application/x-www-form-urlencoded',
          Host: 'xz.jvtc.jx.cn',
          Origin: 'http://xz.jvtc.jx.cn',
          Referer: 'http://xz.jvtc.jx.cn/SPCP/Web/',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
        },
      };
      // 调用登录方法
      login(data);
    } else {
      // 获取ReSubmiteFlag失败
      console.log('========== 获取reSubmiteFlag失败，可能是学校网站打不开 =========='.red.bold);
      console.log('------------------------------');
      // 开始发送邮件
      sendEmail({
        email: toEmail,
        subject: '九职自动填报系统-出错了',
        text: '获取reSubmiteFlag失败',
        html: `${note}-获取reSubmiteFlag失败，可能是学校网站打不开~请检查<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 登录的方法
function login(data) {
  request.post(data, function (error, response, body) {
    if (!error && response.statusCode == 302) {
      const cookie = response.headers['set-cookie'][1].split('; ')[0];
      // console.log(cookie);
      // cookie长这样
      // 'set-cookie': [
      //   'ASP.NET_SessionId=hztez35fyq4nibr5gcbuscsg; path=/; HttpOnly',
      //   'CenterSoftWeb=157778425083C0A847EFA81242D2BA04FD4583355B23E9FF81A77E91F4B51E16D729B9123CFDF6AD4C01565A5396F0D2DA2EC60AB9D265ADB71262F28DBF66765F
      // }
      console.log('========== 登录成功,获取Cookie成功 =========='.green.bold);
      isOpen(cookie);
    } else {
      console.log('========== 登录失败，可能是账号密码错误 =========='.red.bold);
      // 登录失败，开始发送邮件
      console.log('------------------------------');
      // 登录失败，开始发送邮件
      sendEmail({
        email: toEmail,
        subject: '九职自动填报系统-登录失败',
        text: '您在九职健康平台的设置的账号密码不正确',
        html: `${note}-您在九职健康平台的设置的账号密码不正确~请检查<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 判断是否开启填报
function isOpen(cookie) {
  const data = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Account/ChooseSys',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Cookie: cookie,
      Host: 'xz.jvtc.jx.cn',
      Referer: 'http: //xz.jvtc.jx.cn/SPCP/Web/',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
    },
  };
  request(data, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //成功访问
      // console.log(body);
      if (body.indexOf('开启时间') != -1 || body.indexOf('只能4点至19点填报') != -1) {
        // 填报未开启
        console.log('========== 填报尚未开始！ =========='.yellow.bold);
        console.log('------------------------------');
      } else if (body.indexOf('开启中') != -1) {
        //已经开启填报了
        console.log('========== 检测到填报已开启，正在获取对应信息 =========='.green.bold);
        findInfo(cookie);
      } else {
        //未知情况，可能没有成功访问
        //异常
        console.log('========== 可能网站数据出现变更 =========='.red.bold);
        console.log('------------------------------');
        sendEmail({
          email: toEmail,
          subject: '九职自动签到系统-执行错误',
          text: '应该是学校的签到系统数据有变化',
          html: `${note}-请联系QQ：1826024975反馈该情况<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
        });
      }
    } else {
      // 网页访问失败
      console.log('========== 可能学校网站打不开了 =========='.red.bold);
      console.log('------------------------------');
      sendEmail({
        email: toEmail,
        subject: '九职自动签到系统-执行错误',
        text: '应该是学校的官网打不开了',
        html: `${note}-请联系QQ：1826024975反馈该情况<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 获取对应信息方法
function findInfo(cookie) {
  const data = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Cookie: cookie,
      Host: 'xz.jvtc.jx.cn',
      Referer: 'http://xz.jvtc.jx.cn/SPCP/Web/Account/ChooseSys',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
    },
  };
  request(data, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // 访问成功
      if (body.indexOf('当前采集日期已登记！') == -1) {
        //今天还未登记
        // console.log(body);
        // 调用cheerio生成dom树
        const $ = cheerio.load(body);
        // 取出学号
        const studentId = $('#StudentId').attr('value');

        // 取出身份证号
        const idCard = $('#IdCard').attr('value');

        // 取出SpeType
        const speType = $('#SpeType').attr('value');

        // 取出CollegeNo
        const collegeNo = $('#CollegeNo').attr('value');

        // 取出姓名
        const studentName = $('#Name').attr('value');

        //取出性别
        const nSex = $('#NSex').attr('checked');
        const rSex = $('#RSex').attr('checked');
        const studentSex = nSex == undefined ? '女' : '男';

        // 取出学历
        const selSpeType = $("#selSpeType>[selected='selected']").text();

        // 取出学院
        const selCollegeNo = $("#selCollegeNo>[selected='selected']").text();

        // 取出年级
        const selSpeGrade = $("[name='selSpeGrade']>[selected='selected']").text();

        // 取出专业名称
        const specialtyName = $("[name='txtSpecialtyName']").attr('value');

        // 取出班级名称
        const className = $("[name='txtClassName']").attr('value');

        // 取出手机号
        const moveTel = $('#MoveTel').attr('value');

        // 取出采集日期
        const registerDate = $('#RegisterDate').attr('value');

        //=============当前所在地=============
        // 取出省份
        const provinceName = $('#ProvinceName').attr('value');
        //取出省份编码
        const province = $("[name='Province']>[selected='selected']").attr('value');
        // 取出市
        const cityName = $('#CityName').attr('value');
        //取出市编码
        const city = $("[name='City']").attr('data-defaultvalue');
        // 取出县，区
        const countyName = $('#CountyName').attr('value');
        //取出县，区编码
        const county = $("[name='County']").attr('data-defaultvalue');
        // 取出街道
        const comeWhere = $("[name='ComeWhere']").attr('value');

        //=============当前所在地=============

        //=============家庭所在地=============
        // 取出省份
        const faProvinceName = $('#FaProvinceName').attr('value');
        //取出省份编码
        const faProvince = $("[name='FaProvince']>[selected='selected']").attr('value');
        // 取出市
        const faCityName = $('#FaCityName').attr('value');
        //取出市编码
        const faCity = $("[name='FaCity']").attr('data-defaultvalue');
        // 取出县，区
        const faCountyName = $('#FaCountyName').attr('value');
        //取出县，区编码
        const faCounty = $("[name='FaCounty']").attr('data-defaultvalue');
        // 取出街道
        const faComeWhere = $("[name='FaComeWhere']").attr('value');
        //=============家庭所在地=============

        const info = {
          studentId: studentId, //学号
          idCard: idCard, //身份证
          speType: speType,
          collegeNo: collegeNo,
          provinceName: provinceName,
          studentName: studentName, //姓名
          studentSex: studentSex, //性别
          selSpeType: selSpeType, //学历
          selCollegeNo: selCollegeNo, //学院
          selSpeGrade: selSpeGrade, //年级
          specialtyName: specialtyName, //专业名称
          className: className, //班级名称
          moveTel: moveTel, //手机号
          provinceName: provinceName, //所在地-省
          province: province, //所在地编码-省
          cityName: cityName, //所在地-市
          city: city, //所在地编码-市
          countyName: countyName, //所在地—县
          county: county, //所在地编码-县
          comeWhere: comeWhere, //所在地-街道

          faProvinceName: faProvinceName, //家乡-省
          faProvince: faProvince, //家乡编码-省

          faCityName: faCityName, //家乡-市
          faCity: faCity, //家乡编码-市

          faCountyName: faCountyName, //家乡-县
          faCounty: faCounty, //家乡编码-县

          faComeWhere: faComeWhere, //家乡-街道
          registerDate: registerDate, //采集日期
        };
        // console.log(info);
        // for (const key in info) {
        //   console.log('%s:%s'.green, key, info[key])
        // }
        // 调用填报方法
        submit(cookie, info);
      } else {
        console.log('========== 今天您已经填报过了~ =========='.red.bold);
        console.log('------------------------------');
      }
    } else {
      // 填报失败
      console.log('========== 提交失败~ =========='.red.bold);
      console.log('------------------------------');
      // 提交失败，开始发送失败邮件
      sendEmail({
        email: toEmail,
        subject: '九职自动填报系统-填报失败',
        text: '您今天在九职健康平台的自动填报失败~',
        html: `${note}-您今天在九职健康平台的自动填报失败！<b style="color='red'">请自行登录平台检查！</b><br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 提交填报健康信息方法
function submit(cookie, info) {
  const data = {
    StudentId: info.studentId,
    Name: info.studentName,
    MoveTel: info.moveTel,
    Province: info.province,
    City: info.city,
    County: info.county,
    ComeWhere: info.comeWhere,
    FaProvince: info.faProvince,
    FaCity: info.faCity,
    FaCounty: info.faCounty,
    FaComeWhere: info.faComeWhere,
    radio_1: 'bee498e5-35c2-4e27-bb14-745e134d61a8', //今日是否有发烧、咳嗽、呼吸困难等可疑症状 的否选项
    radio_2: '3ca5e8e8-c1bc-4b87-b97e-50e65f927756', //今日是否与疑似或确诊的新冠肺炎人员有接触 的否选项
    Other: '',
    GetAreaUrl: '/SPCP/Web/Report/GetArea',
    Sex: info.studentSex,
    IdCard: info.idCard,
    SpeType: info.speType,
    CollegeNo: info.collegeNo,
    SpeGrade: info.selSpeGrade,
    SpecialtyName: info.specialtyName,
    ClassName: info.className,
    ProvinceName: info.provinceName,
    CityName: info.cityName,
    CountyName: info.countyName,
    FaProvinceName: info.faProvinceName,
    FaCityName: info.faCityName,
    FaCountyName: info.faCountyName,
    radioCount: '2',
    checkboxCount: '0',
    blackCount: '0',
    PZData: [
      {
        OptionName: '否',
        SelectId: 'bee498e5-35c2-4e27-bb14-745e134d61a8',
        TitleId: '2f294f9f-5531-43be-8234-0bf1cc3b30c2',
        OptionType: '0',
      },
      {
        OptionName: '否',
        SelectId: '3ca5e8e8-c1bc-4b87-b97e-50e65f927756',
        TitleId: 'd906cab2-86d0-4f83-afd2-581e38f78bc4',
        OptionType: '0',
      },
    ],
  };
  const options = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      'Content-Length': Buffer.byteLength(JSON.stringify(data)).toString(),
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
      Host: 'xz.jvtc.jx.cn',
      Origin: 'http://xz.jvtc.jx.cn',
      Referer: 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
    },
    form: data,
  };

  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200 && body.indexOf('提交成功') != -1) {
      // 填报成功
      console.log('========== 提交健康信息成功~ =========='.green.bold);
      // 提交成功，开始提交体温
      temperature(cookie, info);
    } else {
      // 填报失败
      console.log('========== 提交健康信息失败~ =========='.red.bold);
      // 提交失败，开始发送失败邮件
      sendEmail({
        email: toEmail,
        subject: '九职自动填报系统-填报失败',
        text: '您今天在九职健康平台的填报失败~',
        html: `${note}-您今天在九职健康平台的填报健康信息失败！<b style="color='red'">请自行登录平台检查！</b><br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 提交体温的方法
function temperature(cookie, info) {
  // 首先获取oderid
  // 获取oderid需要的请求头
  const data = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Temperature/StuTemperatureInfo',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Connection: 'keep-alive',
      Cookie: cookie,
      Host: 'xz.jvtc.jx.cn',
      Referer: 'http://xz.jvtc.jx.cn/SPCP/Web/Account/ChooseSys',
      'Upgrade-Insecure-Requests': 1,
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
    },
  };
  // 发起获取oderid请求
  request(data, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      if (body.indexOf('每天填报次数已完成，不能进行填报操作') !== -1) {
        //体温信息已经填报
        console.log('========== 体温信息今天已经提交过了~ =========='.yellow.bold);
        console.log('------------------------------');
      } else {
        const $ = cheerio.load(body);
        const OrderId = $('#OrderId').val();
        // 获取OrderId成功
        // 发起填报体温请求

        // 提交需要的信息
        const subData = {
          'temperature[OrderId]': OrderId,
          'temperature[UserId]': info.studentId,
          'temperature[UserName]': info.studentName,
          'temperature[ReportDate]': `${new Date().getFullYear()}-${addZero(new Date().getMonth() + 1)}-${addZero(new Date().getDate())}`,
          'temperature[ReportTime]': `${H}:${M}`,
          'temperature[Temperature]': '37.0',
        };
        // 发起请求的配置信息
        const options = {
          url: 'http://xz.jvtc.jx.cn/SPCP/Web/Temperature/SaveTemperature',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            Connection: 'keep-alive',
            'Content-Length': Buffer.byteLength(JSON.stringify(subData)).toString(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Cookie: cookie,
            Host: 'xz.jvtc.jx.cn',
            Origin: 'http://xz.jvtc.jx.cn',
            Referer: 'http://xz.jvtc.jx.cn/SPCP/Web/Temperature/StuTemperatureInfo',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
          },
          form: subData,
        };
        // 发起填报请求
        request.post(options, function (error, response, body) {
          if (!error && response.statusCode === 200 && body.indexOf('成功') != -1) {
            // 提交体温成功
            console.log('========== 提交体温信息成功~ =========='.green.bold);
            sendEmail({
              email: toEmail,
              subject: '九职自动填报系统-填报成功',
              text: '您今天在九职健康平台的自动填报成功~感谢使用本程序',
              html: `${note}-您今天在九职健康平台的自动填报健康信息，体温信息成功~感谢使用本程序<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
            });
          } else {
            // 提交体温失败
            console.log('========== 提交体温信息失败~ =========='.green.bold);
            console.log('------------------------------');
            sendEmail({
              email: toEmail,
              subject: '九职自动填报系统-填报失败',
              text: '您今天在九职健康平台的填报失败~请自行检查',
              html: `${note}-您今天在九职健康平台的填报体温信息失败，请自行登录学习网站检查。<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
            });
          }
        });
      }
    } else {
      // 打开体温网页失败
      console.log('========== 访问体温网页失败！ =========='.red.bold);
      console.log('------------------------------');
      sendEmail({
        email: toEmail,
        subject: '九职自动填报系统-填报失败',
        text: '您今天在九职健康平台的填报失败~请自行检查',
        html: `${note}-应该是学习官网打不开，请自行登录学习网站检查。<br><a href="http://xz.jvtc.jx.cn/SPCP/Web/">官网签到地址</a>&nbsp;<a href="https://gitee.com/hcer1999/autoWriteJvtcHealthInfo">项目开源地址</a>`,
      });
    }
  });
}

// 定义补0方法
function addZero(num) {
  return num < 10 ? '0' + num : num.toString();
}

// 定义发送邮件方法
async function sendEmail(options) {
  // 如果没设置邮箱地址，则直接返回
  if (!options.email) return;
  let testAccount = await nodemailer.createTestAccount();
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: '163', // true for 465, false for other ports
    auth: {
      user: '', // generated ethereal user
      pass: '', // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail(
    {
      from: '"九职自动填报系统" <hhaocheng520@163.com>', // sender address
      to: options.email, // list of receivers
      subject: options.subject, // Subject line
      text: options.text, // plain text body
      html: options.html, // html body
    },
    (err, info) => {
      if (err) {
        console.log('========== 邮件发送失败~ =========='.red.bold);
        console.log('------------------------------');
        return;
      }
      console.log('========== 邮件发送成功~ =========='.green.bold);
      console.log('------------------------------');
    }
  );
}

start();
