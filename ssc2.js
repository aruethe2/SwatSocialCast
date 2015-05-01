var Client = require('castv2').Client;
var mdns = require('mdns');
var iniparser = require('iniparser');

var config;


var browser = mdns.createBrowser(mdns.tcp('googlecast'));

browser.on('serviceUp', function(service) {
  console.log('found device %s at %s:%d', service.name, service.addresses[0], service.port);
  //console.log(service);
  ondeviceup(service.addresses[0], service.name);
 // browser.stop();
});





iniparser.parse('./ssc.conf', function(err,data){
	if (err) {
		console.error("Could not read config file: " + err);
		exit(0);
	} else {
	    config = data;
    	console.log("Read in config file");
    	console.log(config);
    	browser.start();
	}
});






function ondeviceup(host, name) {

  var client = new Client();
  
  var appid;
  if (name == "SwatSocialCast") {
  	appid = config.app.appid;
  } else if (name == "SwatSocialCast2") {
  	appid = config.app.appid2;
  } else if (name == "SwatSocialCast3") {
  	appid = config.app.appid4;
  } else if (name == "SwatSocialCast4") {
  	appid = config.app.appid6;
  } else if (name == "SwatSocialCast5") {
  	appid = config.app.appid5;
  }
  
  console.log("Starting app on client: " + name);
  
  client.connect(host, function() {
    // create various namespace handlers
    var connection = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
    var heartbeat  = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.heartbeat', 'JSON');
    var receiver   = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

    // establish virtual connection to the receiver
    connection.send({ type: 'CONNECT' });

    // start heartbeating
    setInterval(function() {
      heartbeat.send({ type: 'PING' });
      console.log("Heartbeat " + name);
    }, 5000);

    // launch application
    //receiver.send({ type: 'LAUNCH', appId: 'YouTube', requestId: 1 });
    console.log(config.app.appid);
	receiver.send({ type: 'LAUNCH', appId: appid, requestId: 1 });
	
    // display receiver status updates
    receiver.on('message', function(data, broadcast) {
      if(data.type = 'RECEIVER_STATUS') {
        console.log("Receiver status: " + name);
        console.log(data);		// console.log(data.status);
      } else {
      	console.log(data);
      }
    });
  });

}