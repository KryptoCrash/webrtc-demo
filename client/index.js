const socket = io.connect();
const configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
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
    peerConnection.addEventListener('icecandidate', event => {
        console.log("FOUND ICE")
        if (event.candidate) {
            socket.emit('ice', btoa(JSON.stringify(event.candidate)));
        }
    });

    peerConnection.addEventListener('icegatheringstatechange', e => {
        console.log(e.target.iceGatheringState)
    })

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

    peerConnection.addEventListener('track', async event => {
        remoteStream.addTrack(event.track, remoteStream);
    })
}

async function main() {
    const stream = await displayMedia();

    document.addEventListener("keypress", async () => {
        await makeCall();
    })

    await answer();
    await sendMedia(stream);
    await recieveMedia();
    await findICE();

    peerConnection.addEventListener('connectionstatechange', async e => {
        if (peerConnection.connectionState == 'connected') {
            console.log("yay")
        }
    })
}

main();
