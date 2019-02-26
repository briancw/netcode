/* eslint-disable guard-for-in */
const dgram = require('dgram')
const epoch = Math.floor(Date.now() / 1000) - 30 // Start the epoch 30 seconds ago
const maxSessionTime = 60 // In seconds

class NetcodeServer {
    constructor() {
        this.socket = dgram.createSocket({type: 'udp4', reuseAddr: false})
        this.port = 40000

        this.session = {}
    }

    init(port) {
        this.port = port
        this.socket.on('message', this.message.bind(this))
        this.socket.bind(this.port)
    }

    message(rawMessage, remote) {
        let message = rawMessage.toString()
        let sessionId = message.slice(0, 11)
        let messageType = message.slice(11, 14)
        // console.log(messageType, sessionId)

        switch (messageType) {
        case '001': // Heartbeat
            // No need to respond
            break
        case '002':
            this.sessionKeepAlive(remote, sessionId)
            break
        default:
            console.warn('Unkown message type')
            console.warn(message)
        }
    }

    sessionKeepAlive(remote, sessionId) {
        const {address, port} = remote
        const now = Math.floor(Date.now() / 1000) - epoch
        if (this.sessions[sessionId]) {
            const [previosAddress, previousPort] = this.sessions[sessionId]
            // TODO If address changes, send a challenge to the new address before updating
            // This will prevent bad actors disconnecting players
            if (address !== previosAddress) {
                this.sessions[sessionId][0] = address
            }
            if (port !== previousPort) {
                this.sessions[sessionId][1] = port
            }
            this.sessions[sessionId][2] = now
        } else {
            this.sessions[sessionId] = [address, port, now]
        }
    }

    // Go through all existing sessions and check when we last heard a keepAlive from this user
    cleanupOldSessions() {
        const now = Math.floor(Date.now() / 1000) - epoch
        const oldestTime = now - maxSessionTime
        for (let sessionId in this.sessions) {
            let lastTime = this.sessions[sessionId][2]
            if (lastTime < oldestTime) {
                delete this.sessions[sessionId]
            }
        }
    }
}

module.exports = new NetcodeServer()
