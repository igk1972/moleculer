const ServiceBroker = require("../../../src/service-broker");
const Transit = require("../../../src/transit");
const RedisTransporter = require("../../../src/transporters/redis");
const P = require("../../../src/packets");

jest.mock("ioredis", () => {
	return jest.fn().mockImplementation(() => {
		let onCallbacks = {};
		return {
			on: jest.fn((event, cb) => onCallbacks[event] = cb),
			disconnect: jest.fn(),
			subscribe: jest.fn(),
			publish: jest.fn(),

			onCallbacks
		};
	});
});


describe("Test RedisTransporter constructor", () => {

	it("check constructor", () => {
		let transporter = new RedisTransporter();
		expect(transporter).toBeDefined();
		expect(transporter.opts).toBeUndefined();
		expect(transporter.connected).toBe(false);
		expect(transporter.clientPub).toBeNull();
		expect(transporter.clientSub).toBeNull();
	});

	it("check constructor with string param", () => {
		let transporter = new RedisTransporter("redis://localhost");
		expect(transporter.opts).toEqual("redis://localhost");
	});

	it("check constructor with options", () => {
		let opts = { host: "localhost", port: 1234 };
		let transporter = new RedisTransporter(opts);
		expect(transporter.opts).toBe(opts);
	});
});

describe("Test RedisTransporter connect & disconnect", () => {
	let broker = new ServiceBroker({ logger: false });
	let transit = new Transit(broker);
	let msgHandler = jest.fn();
	let transporter;

	beforeEach(() => {
		transporter = new RedisTransporter();
		transporter.init(transit, msgHandler);
	});

	it("check connect", () => {
		let p = transporter.connect().then(() => {
			expect(transporter.clientSub).toBeDefined();
			expect(transporter.clientSub.on).toHaveBeenCalledTimes(4);
			expect(transporter.clientSub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
			expect(transporter.clientSub.on).toHaveBeenCalledWith("messageBuffer", jasmine.any(Function));

			expect(transporter.clientPub).toBeDefined();
			expect(transporter.clientPub.on).toHaveBeenCalledTimes(3);
			expect(transporter.clientPub.on).toHaveBeenCalledWith("connect", jasmine.any(Function));
			expect(transporter.clientPub.on).toHaveBeenCalledWith("error", jasmine.any(Function));
			expect(transporter.clientPub.on).toHaveBeenCalledWith("close", jasmine.any(Function));
		});

		transporter._clientSub.onCallbacks.connect();
		transporter._clientPub.onCallbacks.connect();

		return p;
	});

	it("check onConnected after connect", () => {
		transporter.onConnected = jest.fn(() => Promise.resolve());
		let p = transporter.connect().then(() => {
			expect(transporter.onConnected).toHaveBeenCalledTimes(1);
			expect(transporter.onConnected).toHaveBeenCalledWith();
		});

		transporter._clientSub.onCallbacks.connect();
		transporter._clientPub.onCallbacks.connect();

		return p;
	});

	it("check disconnect", () => {
		let p = transporter.connect().then(() => {
			let cbSub = transporter.clientSub.disconnect;
			let cbPub = transporter.clientPub.disconnect;
			transporter.disconnect();
			expect(transporter.clientSub).toBeNull();
			expect(transporter.clientPub).toBeNull();
			expect(cbSub).toHaveBeenCalledTimes(1);
			expect(cbPub).toHaveBeenCalledTimes(1);

		});

		transporter._clientSub.onCallbacks.connect(); // Trigger the `resolve`
		transporter._clientPub.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

});


describe("Test RedisTransporter subscribe & publish", () => {
	let transporter;
	let msgHandler;

	beforeEach(() => {
		msgHandler = jest.fn();
		transporter = new RedisTransporter();
		transporter.init(new Transit(new ServiceBroker({ logger: false, namespace: "TEST" })), msgHandler);
		transporter.serialize = jest.fn(() => "json data");
		transporter.incomingMessage = jest.fn();

		let p = transporter.connect();
		transporter._clientSub.onCallbacks.connect(); // Trigger the `resolve`
		transporter._clientPub.onCallbacks.connect(); // Trigger the `resolve`
		return p;
	});

	it("check subscribe", () => {
		transporter.clientSub.subscribe.mockClear();
		transporter.subscribe("REQ", "node");

		expect(transporter.clientSub.subscribe).toHaveBeenCalledTimes(1);
		expect(transporter.clientSub.subscribe).toHaveBeenCalledWith("MOL-TEST.REQ.node");
	});

	it("check incoming message handler", () => {
		// Test subscribe callback
		const buf = Buffer.from("incoming data");
		transporter.clientSub.onCallbacks.messageBuffer("MOL-TEST.event", buf);
		expect(transporter.incomingMessage).toHaveBeenCalledTimes(1);
		expect(transporter.incomingMessage).toHaveBeenCalledWith("event", buf);
	});

	it("check publish", () => {
		transporter.clientPub.publish.mockClear();

		const packet = new P.Packet(P.PACKET_INFO, "node2", { services: {} });
		transporter.publish(packet);

		expect(transporter.clientPub.publish).toHaveBeenCalledTimes(1);
		expect(transporter.clientPub.publish).toHaveBeenCalledWith("MOL-TEST.INFO.node2", "json data");

		expect(transporter.serialize).toHaveBeenCalledTimes(1);
		expect(transporter.serialize).toHaveBeenCalledWith(packet);
	});
});
