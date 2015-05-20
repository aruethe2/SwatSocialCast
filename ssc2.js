var Client = require('castv2-client').Client;
var Searcher = require('node-ssdp').Client
var iniparser = require('iniparser');
var util = require("util");
var _und = require("underscore");
var parseString = require('xml2js').parseString;
var request = require("request");
var util =  require("util");

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

		syncAppId = config.app.appid11;

		searchInterval = setInterval(function() {

			if (searcher) {
				searcher._stop();
			}

			searcher = new Searcher();

			searcher.on('response', function (headers, statusCode, rinfo) {

				if  (!pause_search && chromecast_list.indexOf(rinfo.address) < 0) {
					console.log('Found chromecast running on address', rinfo.address);
					//console.log(headers.LOCATION);
					//console.log(rinfo);
					request(headers.LOCATION, function(error, response, body) {
						//console.log(body);
						parseString(body, function(err, result) {
							if (err) {
								console.log("Cannot parse %s Chromecast headers: %s", rinfo.address, err);
							} else {
								var name = result.root.device[0].friendlyName[0];
								if (name !== null && name !== 'undefined' && name !== '') {
									onConnect(rinfo.address, name);
								}
							}

						});
					}).on('error', function(e) {
						console.log("Error getting  %s Chromecast details: %s", rinfo.address, e.message);
					});
				}
				//searcher._stop();
			});

			console.log("%d Known chromecasts: %s", chromecast_list.length, chromecast_list.join(", "));
			console.log("Searching for chromecasts");

			searcher.search('urn:dial-multiscreen-org:service:dial:1');

		}, 2000);

	}
});






function onConnect(address, name) {

  var client = new Client();
  console.log("Creating new Chromecast connection: %s (%s)", name, address); 

       // Keep track of list of active Chromecasts
        chromecast_list.push(address);
        chromecast_list = _und.uniq(chromecast_list);  // Remove any duplicates



  console.log("List from Chromecasts: %s", chromecast_list.join(", "));

  client.connect(address, function() {

	var receiver = client.receiver;
	var chromecast_name = name;

	function syncApp(app) {
		console.log('syncApp called for %s (%s)', chromecast_name, address);
		console.log(app);

		if(syncApp.launching || app.appId == syncAppId) return;
		console.log('Current app on %s is: %s', chromecast_name, app.appId);
		syncApp.launching = true;

		console.log("Restoring %s to default app %s on %s", app.name, syncAppId, chromecast_name);
		if(app.sessionId) {
			receiver.stop(app.sessionId, function(err, apps) {
				console.log(apps);
			});
		}

		console.log('Launching app on %s (%s)', chromecast_name, address);
		receiver.launch(syncAppId, function(err, response) {
			if (err) {
				console.log('Error launching app on %s (%s)', chromecast_name, address);
				console.log(err);
			} else {
				console.log('App launched on %s (%s)', chromecast_name, address);
				console.log(response);
			}
			// Give Chromecast app some time to relaunch
			setTimeout(function() {syncApp.launching = false;}, 8000);
		});
	}

    client.on("status", function(status) {
	console.log("Got status from chromecast %s (%s)" , chromecast_name, address);
	console.log(status);
	syncApp((status && status.applications && status.applications[0]) || {});
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
    	remove_chromecast_from_list(address); 	
    });


	client.on("close", function() {
		// When closing a connection, remove the address from the list of chromecast addresses
		remove_chromecast_from_list(address) 
		console.log("Closing connection to %s (%s)", chromecast_name, address);
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
