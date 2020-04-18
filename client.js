var io = require('socket.io-client')('http://127.0.0.1:8080')

io.on('new_stream', function(msg) {
    console.log('new stream started', msg)
})

io.on('title_change', function(msg) {
    console.log('title has changed to', msg)
})

io.on('category_change', function(msg) {
    console.log('category has changed to', msg)
})

io.on('stream_uptime', function(msg) {
    console.log('stream up for', msg)
})

io.on('stream_offline', function(msg) {
    console.log('stream went offline at', msg)
})
