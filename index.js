const request = require("request");
const cheerio = require("cheerio");
const program = require("commander");
require("colors");
const VERSION = require('./package.json').version;

program
  .version(VERSION)
  .usage('[options]')
  .option('-u, --username <string>', '设置用户名')
  .option('-p, --password <string>', '设置密码')
  .parse(process.argv);

const username = program.username;
const password = program.password;

console.log('========== 准备登录学号为：%s =========='.green.bold, username);

// 生成验证码
function NewCode() {
  var code = "";
  var codeLength = 4;
  var selectChar = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  for (i = 0; i < codeLength; i++) {
    var charIndex = Math.floor(Math.random() * 62);
    code += selectChar[charIndex];
  }
  return code;
}


// 首次登陆的包
const data = {
  url: 'http://xz.jvtc.jx.cn/SPCP/Web/',
  form: {
    StuLoginMode: "1",
    txtUid: username,
    txtPwd: password,
    codeInput: NewCode()
  },
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Content-Length': '60',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': 'xz.jvtc.jx.cn',
    'Origin': 'http://xz.jvtc.jx.cn',
    'Referer': 'http://xz.jvtc.jx.cn/SPCP/Web/',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36'
  }
};

// 登陆采用post方法   此次提交是为了拿到Cookie
request.post(data, function(error, response, body) {
  if (!error && response.statusCode == 302) {
    // cookie在response.headers['set-cookie']里面
    // 提交的时候有一部分不需要，需要提取出来需要用到的那段cookie
    const cookie = response.headers['set-cookie'][0].split("; ")[0];
    // console.log(cookie);
    console.log("========== 登录成功,正在获取Cookie ==========".green.bold);

    isOpen(cookie);
  } else {
    console.log("登录失败".red.bold);
  }
});

// 此方法是为了判断填报有没有开启
function isOpen(cookie) {
  const data = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Account/ChooseSys',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Cookie': cookie,
      'Host': 'xz.jvtc.jx.cn',
      'Referer': 'http: //xz.jvtc.jx.cn/SPCP/Web/',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36'
    }
  };
  request(data, function(error, response, body) {

    if (!error && response.statusCode == 200) {
      //成功访问
      // console.log(body);
      if (body.indexOf('开启时间') != -1 || body.indexOf('只能6点至18点填报') != -1) {
        // 填报未开启
        console.log("========== 填报尚未开始！ ==========".yellow.bold);
      } else if (body.indexOf('开启中') != -1) {
        //已经开启填报了
        console.log("========== 检测到填报已开启，正在获取对应信息 ==========".green.bold);
        findInfo(cookie);
      } else {
        //未知情况，可能没有成功访问
        console.log("========== 可能网站数据变更-_- ==========".red.bold);
      }
    }
  });
}

//这个方法是用来查询登陆者的信息的
function findInfo(cookie) {
  const data = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Cookie': cookie,
      'Host': 'xz.jvtc.jx.cn',
      'Referer': 'http://xz.jvtc.jx.cn/SPCP/Web/Account/ChooseSys',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36'
    }
  };
  request(data, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      // 访问成功
      if (body.indexOf('当前采集日期已登记！') == -1) {
        //今天还未登记
        // console.log(body);
        // 调用cheerio生成dom树
        const $ = cheerio.load(body);

        // 取出学号
        const studentId = $("#StudentId").attr("value");

        // 取出身份证号
        const idCard = $("#IdCard").attr("value");

        // 取出SpeType
        const speType = $("#SpeType").attr("value");

        // 取出CollegeNo
        const collegeNo = $("#CollegeNo").attr("value");

        // 取出姓名
        const studentName = $("#Name").attr("value");

        //取出性别
        const nSex = $("#NSex").attr("checked");
        const rSex = $("#RSex").attr("checked");
        const studentSex = (nSex == undefined) ? "女" : "男";

        // 取出学历
        const selSpeType = $("#selSpeType>[selected='selected']").text();

        // 取出学院
        const selCollegeNo = $("#selCollegeNo>[selected='selected']").text();

        // 取出年级
        const selSpeGrade = $("[name='selSpeGrade']>[selected='selected']").text();

        // 取出专业名称
        const specialtyName = $("[name='txtSpecialtyName']").attr("value");

        // 取出班级名称
        const className = $("[name='txtClassName']").attr("value");

        // 取出手机号
        const moveTel = $("#MoveTel").attr("value");

        // 取出采集日期
        const registerDate = $("#RegisterDate").attr("value");

        //=============当前所在地=============
        // 取出省份
        const provinceName = $("#ProvinceName").attr("value");
        //取出省份编码
        const province = $("[name='Province']>[selected='selected']").attr("value");
        // 取出市
        const cityName = $("#CityName").attr("value");
        //取出市编码
        const city = $("[name='City']").attr("data-defaultvalue");
        // 取出县，区
        const countyName = $("#CountyName").attr("value");
        //取出县，区编码
        const county = $("[name='County']").attr("data-defaultvalue");
        // 取出街道
        const comeWhere = $("[name='ComeWhere']").attr("value");

        //=============当前所在地=============

        //=============家庭所在地=============
        // 取出省份
        const faProvinceName = $("#FaProvinceName").attr("value");
        //取出省份编码
        const faProvince = $("[name='FaProvince']>[selected='selected']").attr("value");
        // 取出市
        const faCityName = $("#FaCityName").attr("value");
        //取出市编码
        const faCity = $("[name='FaCity']").attr("data-defaultvalue");
        // 取出县，区
        const faCountyName = $("#FaCountyName").attr("value");
        //取出县，区编码
        const faCounty = $("[name='FaCounty']").attr("data-defaultvalue");
        // 取出街道
        const faComeWhere = $("[name='FaComeWhere']").attr("value");
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
            registerDate: registerDate //采集日期
          }
          // console.log(info);
        for (const key in info) {
          console.log("%s:%s".green, key, info[key]);
        }
        confirmSubmit(cookie, info);

      } else {
        console.log("========== 今天您已经填报过了~ ==========".red.bold);
      }
    } else {
      console.log('========== 访问网址失败！ =========='.red.bold);
    }
  });
}

//此方法用来最后的确认提交填报
function confirmSubmit(cookie, info) {
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
      PZData: [{
          "OptionName": "否",
          "SelectId": "bee498e5-35c2-4e27-bb14-745e134d61a8",
          "TitleId": "2f294f9f-5531-43be-8234-0bf1cc3b30c2",
          "OptionType": "0"
        },
        {
          "OptionName": "否",
          "SelectId": "3ca5e8e8-c1bc-4b87-b97e-50e65f927756",
          "TitleId": "d906cab2-86d0-4f83-afd2-581e38f78bc4",
          "OptionType": "0"
        }
      ]
    }
    // console.log(data);

  const options = {
    url: 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Content-Length': Buffer.byteLength(JSON.stringify(data)).toString(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'Host': 'xz.jvtc.jx.cn',
      'Origin': 'http://xz.jvtc.jx.cn',
      'Referer': 'http://xz.jvtc.jx.cn/SPCP/Web/Report/Index',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.100 Safari/537.36'
    },
    form: data
  };

  request.post(options, function(error, response, body) {
    if (!error && response.statusCode == 200 && body.indexOf("提交成功") != -1) {
      console.log("========== 提交成功~ ==========".green.bold);
    } else {
      console.log("========== 提交失败~ ==========".red.bold);
    }
  })
}