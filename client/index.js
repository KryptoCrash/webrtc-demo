const socket = io.connect();
const configuration = { 'iceServers': [{ 'urls': 'stun:stun.services.mozilla.com:3478' }] }
const peerConnection = new RTCPeerConnection(configuration);

// Get tracks for streaming
async function getTracks() {
    return await navigator.mediaDevices.getUserMedia({
        'video': true,
        'audio': true
    })
}

// Display media
async function displayMedia() {
    try {
        const stream = await getTracks();
        const videoElement = document.querySelector('video#localVideo');
        videoElement.srcObject = stream;

        return stream;
    } catch (error) {
        console.error('Error opening video camera.', error);
    }
}

// Create offer and make call
async function makeCall() {
    socket.on('answer', async sdpAnswer => {
        if (sdpAnswer) {
            const remoteDesc = new RTCSessionDescription(JSON.parse(atob(sdpAnswer)));
            await peerConnection.setRemoteDescription(remoteDesc);
        }
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('call', btoa(JSON.stringify(offer)));
}

async function answer() {
    socket.on('call', async sdpOffer => {
        if (sdpOffer) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(sdpOffer))));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer', btoa(JSON.stringify(answer)));
        }
    });
}

async function findICE() {
    // Listen for local ICE candidates on the local RTCPeerConnection
    peerConnection.addEventListener('icecandidate', candidate => {
        console.log("FOUND ICE")
        if (candidate) {
            socket.emit('ice', btoa(JSON.stringify(candidate)));
        }
    });

    // Listen for remote ICE candidates and add them to the local RTCPeerConnection
    socket.on('ice', async candidate => {
        if (candidate) {
            try {
                await peerConnection.addIceCandidate(JSON.parse(atob(candidate)));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        }
    });
}

async function sendMedia(stream) {
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track);
    });
}

async function recieveMedia() {
    remoteStream = new MediaStream();
    remoteVideo = document.querySelector('video#remoteVideo');
    remoteVideo.srcObject = remoteStream;

    peerConnection.addEventListener('track', track => {
        remoteStream.addTrack(track);
    })
}

async function main() {
    const stream = await displayMedia();

    document.addEventListener("keypress", async () => {
        await makeCall(socket, peerConnection);
    })

    await answer();
    await findICE();

    peerConnection.addEventListener('connectionstatechange', async e => {
        console.log(peerConnection.connectionState)
        if (peerConnection.connectionState == 'connected') {
            console.log("HELLO")
            await sendMedia(stream);
            await recieveMedia();
        }
    })
}

main();
