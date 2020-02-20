"use strict";
import { Service } from "moleculer";
import * as rp from "request-promise";
import * as config from 'config';
import * as util from 'util';
import {Errors} from 'moleculer';
const {MoleculerRetryableError} = Errors;

class ResidentsService extends Service {
	constructor(broker){
		super(broker);
		this.parseServiceSchema({
            name: "residents",
            metadata: { service: "residents"},
            mixins : [],
            actions: {
                getResidentData : {
                    cache : true,
                    params : {},
                    handler : this.getResidentData
                }
            }
        });
    }
    
    /**
     * This action gets resident information based on residentId
     * The cache expires in default TTL time
     * The cache is per resident 
     * @param {*} ctx
     * @returns
     * @memberof ResidentsService
     */
    async getResidentData(ctx){
        const method = 'getResidentData';
        try{
            this.logger.info(`Request for method ${method} started`);
            const residentId = ctx && ctx.params && ctx.params.residentId  || "";
            this.logger.info(`Parameters passed residentId : ${residentId}`);

            const options = {
                method : "GET",
                uri : `${config.externalAPIs.users}/${residentId}`,
                json : true
                
            }
            this.logger.info(`GET request for method : ${method} options ${util.inspect(options)}`);
            const results = await rp.get(options);
            this.logger.info(`GET request completed for method : ${method} results ${util.inspect(results)}`);
            return results;
        } catch(err){
            this.logger.error(err);
            // Alert via slack to relevant support channel
            // Retry request with exponential back
            throw new MoleculerRetryableError(`Request failed with err ${util.inspect(err)}`)
        }
        
    }
};

export = ResidentsService;
