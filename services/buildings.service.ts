"use strict";
import { Service } from "moleculer";
import * as rp from "request-promise";
import * as config from 'config';
import * as util from 'util';
import {Errors} from 'moleculer';
const {MoleculerRetryableError} = Errors;

class BuildingService extends Service {
	constructor(broker){
		super(broker);
		this.parseServiceSchema({
            name: "buildings",
            metadata: { service: "buildings"},
            mixins : [],
            actions: {
                getAllBuildingsDetails : {
                    cache : true,
                    params : {},
                    handler : this.getAllBuildingsDetails
                }
            }
        });
    }
    
    /**
     * This action fetches and chaches latest buildings information
     * The cache expires in default TTL time
     * @param {*} ctx
     * @returns
     * @memberof BuildingService
     */
    async getAllBuildingsDetails(ctx){
        const method = 'getAllBuildingsDetails';
        try{
            this.logger.info(`Request for method ${method} started`);
            const options = {
                method : "GET",
                uri : config.externalAPIs.buildings,
                json : true
                
            }
            this.logger.info(`GET request with options ${util.inspect(options)}`);
            const results = await rp.get(options);
            this.logger.info(`GET request completed with results ${util.inspect(results)}`);
            return results;
        } catch(err){
            this.logger.error(err);
            // Alert via slack
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
        
    }
};

export = BuildingService;
