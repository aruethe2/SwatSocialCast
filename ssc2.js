var Client = require('castv2-client').Client;
var DefaultMediaReceiver  = require('castv2-client').DefaultMediaReceiver;
var Searcher = require('node-ssdp').Client
var iniparser = require('iniparser');
var util = require("util");
var _und = require("underscore");

var config;
var syncAppId;
var searchInterval;
var pause_search = false;

var searcher;
var chromecast_list = [];




// Load config
iniparser.parse('./ssc.conf', function(err,data) {

	if (err) {
	
		console.error("Could not read config file: " + err);
		exit(0);
		
	} else {
	
	    config = data;
    	console.log("Read in config file");
    	console.log(config);
    	
    	syncAppId = config.app.appid; 
    	
    	searchInterval = setInterval(function() {
    	
    		if (searcher) {
    			searcher._stop();
    		}
    		
    		searcher = new Searcher();

			searcher.on('response', function (headers, statusCode, rinfo) {
			  
			  if  (!pause_search && chromecast_list.indexOf(rinfo.address) < 0) {  
			    console.log('Found chromecast running on address', rinfo.address);
			  	onConnect(rinfo.address);
			  }
			  //searcher._stop();
			});
			
			console.log("%d Known chromecasts: %s", chromecast_list.length, chromecast_list.join(", "));
			console.log("Searching for chromecasts");
			
    		searcher.search('urn:dial-multiscreen-org:service:dial:1');}, 5000);

	}
});






function onConnect(address) {

  var client = new Client();

  client.connect(address, function() {
    var receiver = client.receiver;
    
	chromecast_list.push(address);
	chromecast_list = _und.uniq(chromecast_list);  // Remove any duplicates


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


    client.launch(DefaultMediaReceiver, function(err, player) {
      var media = {
        // Here you can plug an URL to any mp4, webm, mp3 or jpg file with the proper contentType.
        contentId: config.app.video,
        contentType: 'video/mp4',
        streamType: 'BUFFERED', // or LIVE      
      };
    }




    client.on("status", function(status) {
    	console.log("Got status from chromecast at %s" , address);
      //syncApp((status && status.applications && status.applications[0]) || {});
      
    });
  
    
    client.on("error", function(err) {  
    	console.log(util.inspect(err, {depth:null, colors:true}));	   	
    	if (err.code == "ECONNRESET") {
    		console.log("Connection reset for chromecast at " + address);
    	} else if (err.code == "EHOSTUNREACH") {
    		console.log("Chromecast unreachable at " + address);
    	} else if (err.message == "Device timeout") {
    		console.log("Chromecast timed out at " + address);
    	} else if (err.message == "read ETIMEDOUT") {
    		console.log("Chromecast experienced a time out at " + address); 
    	} else {
    		console.log("Error with chromecast at: " + address);
    		console.log(util.inspect(client, {depth:3, colors:true}));
    	}
    
    	// When there is an error, remove the address from the list of chromecast addresses
    	client.close(); 	
    });


	client.on("close", function() {
		// When closing a connection, remove the address from the list of chromecast addresses
		remove_chromecast_from_list(address) 
		console.log("Closing connection to chromecast at %s", address);
	});

    client.getStatus(function(err, status) {
      if(!err) {
        client.emit("status", status);
      }
    });
  });
}



// Remove a chromecast from the active listing.  Called with an ip address
function remove_chromecast_from_list(address) {
		pause_search = true;
		console.log("Removing chromecast %s from list of chromecasts %s", address, chromecast_list.join(", "));
		chromecast_list = _und.without(chromecast_list, address);
		console.log("New list of chromecasts %s", chromecast_list.join(", "));
		pause_search = false;
}