/*
 * moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const { MoleculerClientError } = require("./errors");

module.exports = function() {
	const schema = {
		name: "$node",

		actions: {
			list: {
				cache: false,
				params: {
					withServices: { type: "boolean", optional: true },
					onlyAvailable: { type: "boolean", optional: true },
				},
				handler(ctx) {
					return this.broker.registry.getNodeList(ctx.params);
				}
			},

			services: {
				cache: false,
				params: {
					onlyLocal: { type: "boolean", optional: true },
					skipInternal: { type: "boolean", optional: true },
					withActions: { type: "boolean", optional: true },
					onlyAvailable: { type: "boolean", optional: true },
				},
				handler(ctx) {
					let res = [];

					const services = this.broker.registry.getServiceList(ctx.params);

					// Pre-process list, group services by nodes.
					services.forEach(svc => {
						let item = res.find(o => o.name == svc.name && o.version == svc.version);
						if (item) {
							item.nodes.push(svc.nodeID);
							// Merge services
							_.forIn(svc.actions, (action, name) => {
								if (action.protected === true) return;

								if (!item.actions[name])
									item.actions[name] = _.omit(action, ["handler", "service"]);
							});

						} else {
							item = _.pick(svc, ["name", "version", "settings", "metadata"]);
							item.nodes = [svc.nodeID];
							item.actions = {};
							_.forIn(svc.actions, (action, name) => {
								if (action.protected === true) return;

								item.actions[name] = _.omit(action, ["handler", "service"]);
							});
							res.push(item);
						}
					});

					return res;
				}
			},

			actions: {
				cache: false,
				params: {
					onlyLocal: { type: "boolean", optional: true },
					skipInternal: { type: "boolean", optional: true },
					withEndpoints: { type: "boolean", optional: true },
					onlyAvailable: { type: "boolean", optional: true },
				},
				handler(ctx) {
					return this.broker.registry.getActionList(ctx.params);
				}
			},

			events: {
				cache: false,
				params: {
					onlyLocal: { type: "boolean", optional: true },
					skipInternal: { type: "boolean", optional: true },
					withEndpoints: { type: "boolean", optional: true },
					onlyAvailable: { type: "boolean", optional: true },
				},
				handler(ctx) {
					return this.broker.registry.getEventList(ctx.params);
				}
			},

			health: {
				cache: false,
				handler() {
					return this.broker.getHealthStatus();
				}
			},

			options: {
				cache: false,
				params: {
				},
				handler() {
					return _.cloneDeep(this.broker.options);
				}
			},

			metrics: {
				cache: false,
				params: {
					types: [ { type: "string", optional: true }, { type: "array", optional: true, items: "string" } ],
					includes: [ { type: "string", optional: true }, { type: "array", optional: true, items: "string" } ],
					excludes: [ { type: "string", optional: true }, { type: "array", optional: true, items: "string" } ]
				},
				handler(ctx) {
					if (!this.broker.isMetricsEnabled())
						return this.Promise.reject(new MoleculerClientError("Metrics feature is disabled", 400, "METRICS_DISABLED"));

					return this.broker.metrics.list(ctx.params);
				}
			}
		}
	};

	return schema;
};
