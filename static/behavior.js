var socket = io.connect();

socket.on('result', function(data) {
	console.log('Incoming result:', data);
});

const app = Vue.createApp({
	data() {
		return {
			current_device: -1,
			devices: [{"id":0,"name":"Plant Cam","url":"http://192.168.1.200/mjpeg/1","capabilities":[{"light":true,"neo":6}],"active":true,"stackname":"collect_frame_stack"},{"id":1,"name":"Dog Cam","url":"http://admin:@192.168.1.203/videostream.cgi","capabilities":[{"pantilt":true}],"active":true,"stackname":"collect_dog_stack"}]
		}
	},
	methods: {
		setCurrentDevice(did) {
			this.current_device = did;
			socket.emit('deviceid', did);
		},

		startStack(did) {

		},

		stopStack(did) {

		}
	}
});

app.mount('#app');