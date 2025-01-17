/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

/**
 * Node class
 *
 * @class Node
 */
class Node {
	/**
	 * Creates an instance of Node.
	 *
	 * @param {String} id
	 *
	 * @memberof Node
	 */
	constructor(id) {
		this.id = id;
		this.instanceID = null;
		this.available = true;
		this.local = false;
		this.lastHeartbeatTime = Date.now();
		this.config = {};
		this.client = {};
		this.metadata = null;

		this.ipList = null;
		this.port = null;
		this.hostname = null;
		this.udpAddress = null;

		this.rawInfo = null;
		this.services = [];

		this.cpu = null;
		this.cpuSeq = null;

		this.seq = 0;
		this.offlineSince = null;
	}

	/**
	 * Update properties
	 *
	 * @param {object} payload
	 * @param {boolean} isReconnected
	 * @memberof Node
	 */
	update(payload, isReconnected) {
		// Update properties
		this.metadata = payload.metadata;
		this.ipList = payload.ipList;
		this.hostname = payload.hostname;
		this.port = payload.port;
		this.client = payload.client || {};
		this.instanceID = payload.instanceID;

		// Process services & events
		this.services = payload.services;
		this.rawInfo = payload;

		const newSeq = payload.seq || 1;
		if (newSeq > this.seq || isReconnected) {
			this.seq = newSeq;
			return true;
		}
	}

	/**
	 * Update local properties
	 *
	 * @memberof Node
	 */
	updateLocalInfo(cpuUsage) {
		return cpuUsage().then(res => {
			const newVal = Math.round(res.avg);
			if (this.cpu != newVal) {
				this.cpu = Math.round(res.avg);
				this.cpuSeq++;
			}
		}).catch(() => { /* silent */ });
	}

	/**
	 * Update heartbeat properties
	 *
	 * @param {any} payload
	 * @memberof Node
	 */
	heartbeat(payload) {
		if (!this.available) {
			this.available = true;
			this.offlineSince = null;
		}

		this.cpu = payload.cpu;
		this.cpuSeq = payload.cpuSeq || 1;

		this.lastHeartbeatTime = Date.now();
	}

	/**
	 * Node disconnected
	 *
	 * @memberof Node
	 */
	disconnected() {
		if (this.available) {
			this.offlineSince = Date.now();
			this.seq++;
		}

		this.available = false;
	}
}

module.exports = Node;
