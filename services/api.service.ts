import { ServiceSchema } from "moleculer";
import ApiGateway = require("moleculer-web");

const ApiService: ServiceSchema = {
	name: "api",

	mixins: [ApiGateway],

	settings: {
		port: process.env.PORT || 3000,

		routes: [{
			path: "/api/reports",
			whitelist: ["**"],
			use : [

			],
			aliases: {
				"GET " 	:   "reports.getReport"
			},
			bodyParsers: {
				json: {
					strict: false
				},
				urlencoded: {
					extended: false
				}
			},
		}],

		assets: {
			folder: "public",
		},
	},
};

export = ApiService;
