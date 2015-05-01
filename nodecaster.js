var nodecastor = require('nodecastor'),
	util = require('util');

nodecastor.scan()
  .on('online', function(d) {
    console.log('New device', util.inspect(d));
  })
  .on('offline', function(d) {
    console.log('Removed device', util.inspect(d));
  })
  .start();