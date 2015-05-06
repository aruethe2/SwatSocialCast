var Client = require('castv2-client').Client;
var mdns = require('mdns');
var iniparser = require('iniparser');

var config;
var syncAppId;

var browser = mdns.createBrowser(mdns.tcp('googlecast'));

browser.on('serviceUp', function(service) {
  console.log('found device %s at %s:%d', service.name, service.addresses[0], service.port);
  onConnect(service);
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
    	//app = {appId:config.app.appid, name: "testing"};
    	syncAppId = config.app.appid; 
    	browser.start();
	}
});






function onConnect(service) {

  var client = new Client();

  client.connect(service.addresses[0], function() {
    var receiver = client.receiver;


    function syncApp(app) {
      if(syncApp.launching || app.appId === syncAppId) return;

      syncApp.launching = true;

      console.log("Restoring %s to default app: %s...", app.name, syncAppId);
      if(app.sessionId) {
        receiver.stop(app.sessionId, function(err, apps) {
          console.log(apps);
        });
      }

      receiver.launch(syncAppId, function(err, response) {
        syncApp.launching = false;
      });
    }

    client.on("status", function(status) {
    	console.log("Got status");
      syncApp((status && status.applications && status.applications[0]) || {});
      
    });
    
    client.on("error", function(err) {
    	console.log(err.message);
    	console.log(client);
    	syncApp((status && status.applications && status.applications[0]) || {});
    });

    client.getStatus(function(err, status) {
      if(!err) {
        client.emit("status", status);
      }
    });
  });
}




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
      heartbeat.send({ type: 'PING' , requestId: 2});
      //receiver.send({ type: 'GET_STATUS', requestId: 2});
      console.log("Heartbeat " + name);
    }, 5000);

    // launch application
    console.log(config.app.appid);
	receiver.send({ type: 'LAUNCH', appId: appid, requestId: 1 });
	
    // display receiver status updates
    receiver.on('message', function(data, broadcast) {
      if(data.type = 'RECEIVER_STATUS') {
        console.log("Receiver status: " + name);
        console.log(data);		// console.log(data.status);
      } else if (data.type = 'PONG') { 
      	console.log("Got heartbeat response from %s", name);
      } else {
      	console.log(data);
      }
    });
  });
  
  client.on('error', function(err) {
  	console.log("Error %s", err.message);
  	client.close();
  });

  client.on('close', function(err) {
  	console.log("Connection closed");
  });

}