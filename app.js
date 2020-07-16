var express = require('express')
  , http = require('http')
  , path = require('path');

var bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , static = require('serve-static')
  , errorHandler = require('errorhandler');


var expressErrorHandler = require('express-error-handler');


var expressSession = require('express-session');
  

var passport = require('passport');
var flash = require('connect-flash');


var config = require('./config/config');

var database = require('./database/database');


var route_loader = require('./routes/route_loader');

//socket.io 사용
var socketio = require('socket.io');
var cors = require('cors');

var app = express();



app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
console.log('뷰 엔진이 ejs로 설정되었습니다.');



console.log('config.server_port : %d', config.server_port);
app.set('port', process.env.PORT || 3000);
 

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())


app.use('/public', static(path.join(__dirname, 'public')));
 

app.use(cookieParser());


app.use(expressSession({
	secret:'my key',
	resave:true,
	saveUninitialized:true
}));

//cors는 초기화가 필요하다.
app.use(cors());

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
 


var router = express.Router();
route_loader.init(app, router);


var configPassport = require('./config/passport');
configPassport(app, passport);

var userPassport = require('./routes/user_passport');
userPassport(router, passport);



var errorHandler = expressErrorHandler({
 static: {
   '404': './public/404.html'
 }
});

app.use( expressErrorHandler.httpError(404) );
app.use( errorHandler );


process.on('uncaughtException', function (err) {
	console.log('uncaughtException 발생함 : ' + err);
	console.log('서버 프로세스 종료하지 않고 유지함.');
	
	console.log(err.stack);
});

process.on('SIGTERM', function () {
    console.log("프로세스가 종료됩니다.");
    app.close();
});

app.on('close', function () {
	console.log("Express 서버 객체가 종료됩니다.");
	if (database.db) {
		database.db.close();
	}
});

var server = http.createServer(app).listen(app.get('port'), function(){
	console.log('서버가 시작되었습니다. 포트 : ' + app.get('port'));

	database.init(app, config);
   
});

//웹서버가 실행된후 socket.io를 시작한다.listen함수를 통해 대기상태로 만들어준다. attach함수와 동일하다.(socketio.attach(server))
var io = socketio.listen(server);
console.log('socket.io 요청을 받아들일 준비가 되었습니다.');

//클라이언트가 연결을 시도했을때 함수 실행
io.sockets.on('connection', function(socket){
	console.log('connection info -> ' + JSON.stringify(socket.request.connection._peername));
	

	socket.remoteAddress = socket.request.connection._peername.address;
	socket.remotePort = socket.request.connection._peername.port;
});