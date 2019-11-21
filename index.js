/* -- Twitch Stream Events Pipeline --
 * Purpose: Look for changes in a stream (title, category, online) and push these to another application through socket.io
 * Status: Prototype / Evaluation
 * Creation: 2019-11-26
 * Origin URL: https://github.com/cakejs/twitch-stream-events
 *
 * Requirements: 
 * - NodeJS installation 
 * - https w/trusted certificate
 * 
 * Bearer Token:
 * - Create an app in the Twitch Developer Dashboard
 * - Grab the generated 'client id'
 * - Grab the redirect entered (Twitch recommends http://localhost for testing)
 * - Replace the cURL command fields below where appropriate
 *   $ curl "https://id.twitch.tv/oauth2/authorize?client_id=<client ID>&redirect_uri=<app redirect URI>&response_type=token&scope="
 *
 * - Go to the returned URL in a browser and follow the instructions.
 * - After clicking 'Accept', the redirect will likely end up being http://localhost
 * - Grab the bearer token in the URL parameters after clicking through the 'login' + 'authorization allowed' 
 *   redirect and add this to ./settings.json under the `"Token":` field.
 */

const TwitchWebhook = require('twitch-webhook')
const config = require('./settings.json')
const gradient = require('gradient-string')

const http = require('http')
const io = require('socket.io')()

const PORT = config.SocketPort || 8080
const ADDR = config.SocketAddr || '127.0.0.1'

const server = http.createServer()
io.attach(server)
server.listen(PORT, ADDR)

var currentState = {title: "", game_id: -1, event_type: "", started_at: ""}

io.on('connection', function(socket) {
    console.log(gradient.retro("[+] Client connected (socket.io server)"))
})

if(!config.LeaseRenewalInterval) {
    console.log(gradient.retro("[-] LeaseRenewalInterval was not provided in settings.json"))
    process.exit(1)
}

function subscribeStreamEvent() {
    console.log(gradient.retro(`[+] Webhook update: 'streams' [exp: ${config.LeaseSeconds}s | renews: ${config.LeaseRenewalInterval}s]`))
    twitchWebhook.subscribe('streams', {
        user_id: config.Event.BroadcasterId
    })
}

const twitchWebhook = new TwitchWebhook({
    token: config.Token,
    callback: config.Callback,
    secret: config.CallbackSecret,
    lease_seconds: config.LeaseSeconds,
    listen: {
        port: config.ListenPort,
        host: config.ListenHost,
        autoStart: config.ListenAutoStart
    }
})

twitchWebhook.on('streams', ({ event}) => {
    let sEvent = JSON.parse(JSON.stringify(event))

    for (e in sEvent.data) {
        let ev = sEvent.data[e]

        if(currentState.started_at !== ev.started_at) {
            console.log(gradient.retro(`[~] New stream started at: ${ev.started_at}`))
            console.log(gradient.retro(`[~] Category/Game ID: ${ev.game_id}`))
            console.log(gradient.retro(`[~] Title: ${ev.title}`))

	    io.emit('new_stream', ev.started_at)

            currentState.started_at = ev.started_at
	    currentState.title = ev.title
	    currentState.game_id = ev.game_id
        }
 
        if(currentState.game_id !== ev.game_id) {
            console.log(gradient.retro(`[~] Category/Game ID changed to ${ev.game_id}`))

	    io.emit('category_change', ev.game_id)

            currentState.game_id = ev.game_id
        }
  
        if(currentState.title !== ev.title) {
            console.log(gradient.retro(`[~] Title changed to ${ev.title}`))

	    io.emit('title_change', ev.title)

            currentState.title = ev.title
        }
 	
	console.log(gradient.retro("---"))
    }

})

/*
 * WebSub spec: 5.1 Subscriber Sends Subscription Request
 *
 * Renew webhook when it expires -- Twitch doesn't notify/callback on expiration,
 * so try to renew/overwrite as closely to the previous subscription as 
 * possible (per user's requested LeaseRenewalInterval) 
 *
 */

setInterval(subscribeStreamEvent, config.LeaseRenewalInterval * 1000)

process.on('SIGINT', () => {
    twitchWebhook.unsubscribe('*')
    process.exit(0)
})

console.log(gradient.retro.multiline([
    'Stream events webhook processor',
    '[+] Ready. Waiting for events.',
    `[+] A socket.io server is listening on ${ADDR}:${PORT}`,
].join('\n')))

subscribeStreamEvent()
