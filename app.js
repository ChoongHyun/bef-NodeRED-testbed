/**
 * declare requires
 */
// http
var http = require('http');
// https
const https = require('https');
// files
const fs = require('fs');
// node.js http와 connect 컴포넌트 기반의 웹 프레임워크
var express = require('express');
// request
var request = require('request');
// Create an Express app
var app = express();
// node-red 를 위해 package.json에 depdency 추가
var RED = require('node-red');
//cross-orgin
var cors = require('cors');
// cookie
var cookieParser = require('cookie-parser');
// http body 영역
var bodyParser = require('body-parser');
// Create a server
// var server = http.createServer(app);
const options = {
    key: fs.readFileSync('/usr/src/node-red/BEF-server/star_bef_exntu_net.key'),
    // key: fs.readFileSync('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/BEF-server/star_bef_exntu_net.key'),
    cert: fs.readFileSync('/usr/src/node-red/BEF-server/star_bef_exntu_net.crt')
    // cert: fs.readFileSync('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/BEF-server/star_bef_exntu_net.crt')
};
var server = https.createServer(options,app);

/**
 * NodeRED settings 영역
 */
// Create the settings object - see default settings.js file for other options
var settings = {
    // editor
    httpAdminRoot: '/',
    // 실행 된 node 하위 경로
    httpNodeRoot: '/',
    // 해당 node-red의 settings.js를 이용 경로 설정 & 저장 경로
    userDir:'/usr/src/node-red/',
    // userDir:'/Users/choong/Downloads/NodeRED/save/',
    // custom node
    nodesDir: '/usr/src/node-red/BEF-UI/custom/node/',
    // nodesDir: '/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/BEF-UI/custom/node/',
    // admin auth
    adminAuth: require('./BEF-server/bef-admin-auth.js'),
    // category 순서
    paletteCategories: [
//        'SK_API', 'subflows', 'input', 'output', 'function',
//        'social', 'mobile', 'analysis', 'advanced'
        'SKT_API', 'subflows', 'input', 'output', 'function',
        'mobile', 'analysis', 'advanced'
        ,'social', 'mobile', 'analysis', 'advanced'
    ],
	// 삭제할 노드
	nodesExcludes:['75-exec.js','28-tail.js','50-file.js','31-tcpin.js','32-udp.js','23-watch.js', '22-websocket.js'], 
		//, '21-httpin.js'],

    // editor theme
    editorTheme: {
        page: {
            // Title
            title: 'sketch',
            // UI CSS
            css: "/usr/src/node-red/BEF-UI/custom/css/bef-ui-white.css",
            // css: "/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/BEF-UI/custom/css/bef-ui-white.css",
            // UI scripts
            scripts: '/usr/src/node-red/BEF-UI/custom/js/bef-js.js'
            // scripts: '/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/BEF-UI/custom/js/bef-js.js'
        },
        userMenu: false
    },
    // ui 실행 되는 node 하위 경로의 middleware 동작
    httpNodeMiddleware: function(req,res,next) {
        console.log('BEF - httpNodeMiddleware');
        next();
    },
    // 실행 되는 Node 관련 cors orgin
    httpNodeCors: {
        origin: '*',
        methods: 'GET,PUT,POST,DELETE'
    },
    // 실행 되는 Node static path
    httpStatic: '/static',
    // logging
    logging: {
        // Only console logging is currently supported
        console: {
            // Level of logging to be recorded. Options are:
            // fatal - only those errors which make the application unusable should be recorded
            // error - record errors which are deemed fatal for a particular request + fatal errors
            // warn - record problems which are non fatal + errors + fatal errors
            // info - record information about the general running of the application + warn + error + fatal errors
            // debug - record information which is more verbose than info + info + warn + error + fatal errors
            // trace - record very detailed logging + debug + info + warn + error + fatal errors
            // off - turn off all logging (doesn't affect metrics or audit)
            level: 'debug',
            // Whether or not to include metric events in the log output
            metrics: false,
            // Whether or not to include audit events in the log output
            audit: false
        }
    }
    // ,flowFile: '/usr/src/node-red/flows.json'
};

/**
 * cors orgin 허용
 */
app.use(cors());
// option관련 모두 허용 ( GET,POST,DELETE,PUT )
app.options('*', cors());

/**
 * Cookie 관련
 */
app.use(cookieParser());
// http body
app.use(bodyParser.json());
// custom 된 JSON 형태도 허용할 경우
app.use(bodyParser.json({ type: 'application/*+json' }));
// Cookie 설정 api
app.post('/cookie', function(req,res){
    var appParam = req.query['appId'];
    settings.adminAuth.getValidation(appParam, req.body.name, req.body.token);
    res.sendStatus(200);
    res.end();
});
// Cookie 삭제 api
app.delete('/cookie', function(req,res){
    settings.adminAuth.removeUserRole();
    // cookie 이름 bef-login-token 만 삭제
    res.clearCookie('bef-login-token');
    res.sendStatus(204);
    res.end();
});

// 해당 url로 들어오는 부분은 auth 체크
// [/, /vendor, /red, /theme, /static, /locales, /settings, /library, /nodes, /debug, /ui_base, /uisettings, /flows, /icons]
var restrictUrl = [];
// restrictUrl.push('*');
restrictUrl.push('/');
// restrictUrl.push('*/settings');
// restrictUrl.push('*/auth/*');
//restrictUrl.push('*/flows');
// restrictUrl.push('*/flow');
// restrictUrl.push('*/flow/*');
// restrictUrl.push('*/nodes');
// restrictUrl.push('*/nodes/*');
// request 권한 ( interceptor 라고 생각함 )
app.get(restrictUrl, function(req,res,next){
    // get Cookie
    var cookie = req.cookies;
    // request url
    var path = req.url;
    // param
    var appParam = req.query['appId'];
    // nodeRedLocalURL
    var nodeRedUrl = req.get('host');

    if( appParam ){
        next();
    }else{
        settings.adminAuth.getCookie(path, nodeRedUrl, res, next );
    }
});

/**
 * Embedded NodeRED 영역
 */
// Add a simple route for static content served from 'public' ( 해당 방법으로 static 설정 가능, 우선 하위 방법으로 적용)
// app.use('/',express.static('public'));

// static file load (static 설정)
app.use('/static/BEF-UI/custom/css/font/',express.static('./BEF-UI/custom/css/font'));
app.use('/static/BEF-UI/custom/image/',express.static('./BEF-UI/custom/image'));
app.use('/static/BEF-UI/custom/css/',express.static('./BEF-UI/custom/css'));

// Initialise the runtime with a server and settings
RED.init(server,settings);
// serve the http : admin
app.use(settings.httpAdminRoot,RED.httpAdmin);
// serve the http : nodes
app.use(settings.httpNodeRoot,RED.httpNode);

/**
 * error handling
 */
// 401 page error 페이지로 넘기는 처리 방법
app.get( ['/noauth','auth/login'], function(req,res){
    res.status(401);
    res.sendFile('/usr/src/node-red/HTML/401page.html');
    // res.sendFile('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/HTML/401page.html');
});
// 에러 페이지
app.get('/error', function(req,res){
    res.status(500);
    res.sendFile('/usr/src/node-red/HTML/500page.html');
    // res.sendFile('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/HTML/500page.html');
});
// 404 page error 페이지로 넘기는 처리 방법
app.get('*', function(req,res){
    res.status(404);
    res.sendFile('/usr/src/node-red/HTML/404page.html');
    // res.sendFile('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/HTML/404page.html');
});
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(500);
    res.sendFile('/usr/src/node-red/HTML/500page.html');
    // res.sendFile('/Users/choong/Downloads/NodeRED/github/bef-NodeRED-testbed/HTML/500page.html');
});

/**
 * Server
 */
// listen
server.listen(1880);
// Start the runtime
// node-red document 가면 RED runtime api 참고
RED.start().then(function(){
    console.log('BEF - RED.START');
});




